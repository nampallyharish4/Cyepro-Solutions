import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './utils/supabaseClient';
import { SchedulerService } from './services/SchedulerService';
import { NotificationController } from './controllers/NotificationController';
import { AuthController } from './controllers/AuthController';

import { AIService } from './services/AIService';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Start the background jobs
SchedulerService.start();

// API Routes
app.post('/api/login', AuthController.login);
app.post('/api/notifications', NotificationController.submitEvent);
app.get('/api/metrics', NotificationController.getMetrics);
app.get('/api/audit', NotificationController.getAuditLogs);
app.get('/api/rules', NotificationController.getRules);
app.post('/api/rules', NotificationController.createRule);

app.get('/health', async (req: Request, res: Response) => {
  const aiStatus = AIService.getStatus();
  
  // Basic DB check
  let dbStatus = 'CONNECTED';
  try {
    const { error } = await supabase.from('notification_events').select('id').limit(1);
    if (error) dbStatus = 'ERROR';
  } catch (e) {
    dbStatus = 'DISCONNECTED';
  }

  res.status(200).json({
    status: dbStatus === 'CONNECTED' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    engine: 'READY',
    stack: 'NEXT_SUPABASE',
    service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURED' : 'MISSING',
    database: dbStatus,
    ai_service: {
      status: aiStatus.circuitBreaker === 'CLOSED' ? 'HEALTHY' : 'CIRCUIT_OPEN',
      ...aiStatus
    }
  });
});

app.listen(port, () => {
  console.log(`Notification Engine (Next+Supabase) running on port ${port}`);
});

export default app;
