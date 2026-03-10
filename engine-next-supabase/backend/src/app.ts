import dotenv from 'dotenv';
dotenv.config(); // Must be first — loads env vars before any other module reads them

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { supabase } from './utils/supabaseClient';
import { SchedulerService } from './services/SchedulerService';
import { AIService } from './services/AIService';

import authRoutes from './routes/authRoutes';
import notificationRoutes from './routes/notificationRoutes';
import ruleRoutes from './routes/ruleRoutes';
import deferredQueueRoutes from './routes/deferredQueueRoutes';

const app = express();
const port = process.env.PORT || 3001;

// 1. Security Headers
app.use(helmet());

// 2. Structured Request Logging (Production style)
app.use(morgan('short'));

// 3. CORS Configuration (Strict in Prod)
const isProd = process.env.NODE_ENV === 'production';
app.use(
  cors({
    origin: isProd ? (process.env.FRONTEND_URL || 'https://cyepro-solutions.vercel.app') : true,
    credentials: true,
  }),
);

// 4. Rate Limiting (Protects from brute-force & spam)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per `window`
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 5. Body Parsing
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
