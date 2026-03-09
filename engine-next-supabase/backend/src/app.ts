import dotenv from 'dotenv';
dotenv.config(); // Must be first — loads env vars before any other module reads them

import express, { Request, Response } from 'express';
import cors from 'cors';
import { supabase } from './utils/supabaseClient';
import { SchedulerService } from './services/SchedulerService';
import { AIService } from './services/AIService';

import authRoutes from './routes/authRoutes';
import notificationRoutes from './routes/notificationRoutes';
import ruleRoutes from './routes/ruleRoutes';
import deferredQueueRoutes from './routes/deferredQueueRoutes';

const app = express();
const port = process.env.PORT || 5000;

// Relax CORS for local development
app.use(
  cors({
    origin: true, // Allow all origins to connect (reflects origin back)
    credentials: true,
  }),
);
app.use(express.json());

// Start the background jobs
SchedulerService.start();

// Health endpoint (public for monitoring)
app.get('/health', async (req: Request, res: Response) => {
  const aiStatus = AIService.getStatus();

  let dbStatus = 'CONNECTED';
  let dbErrorDetail = null;
  try {
    const { error } = await supabase
      .from('notification_events')
      .select('id')
      .limit(1);
    if (error) {
      dbStatus = 'ERROR';
      dbErrorDetail = error;
    }
  } catch (e: any) {
    dbStatus = 'DISCONNECTED';
    dbErrorDetail = e.message;
  }

  res.status(200).json({
    status: dbStatus === 'CONNECTED' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    engine: 'READY',
    stack: 'NEXT_SUPABASE',
    service_role: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'CONFIGURED'
      : 'MISSING',
    database: dbStatus,
    database_error: dbErrorDetail,
    ai_service: {
      status: aiStatus.circuitBreaker === 'CLOSED' ? 'HEALTHY' : 'CIRCUIT_OPEN',
      ...aiStatus,
    },
  });
});

// Mount route modules
app.use('/api', authRoutes);
app.use('/api', notificationRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/deferred-queue', deferredQueueRoutes);

app.listen(port, () => {
  console.log(`Notification Engine (Next+Supabase) running on port ${port}`);
});

export default app;
