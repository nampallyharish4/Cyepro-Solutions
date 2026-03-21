import dotenv from 'dotenv';
dotenv.config(); // Must be first — loads env vars before any other module reads them

import express, { NextFunction, Request, Response } from 'express';
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
const port = process.env.PORT || 5000;

// Trust proxy headers when running behind a managed reverse proxy (e.g. Render).
// Can be overridden explicitly with TRUST_PROXY (0, 1, true, false).
if (process.env.TRUST_PROXY !== undefined) {
  const configured = process.env.TRUST_PROXY.trim().toLowerCase();
  if (configured === 'true') app.set('trust proxy', true);
  else if (configured === 'false') app.set('trust proxy', false);
  else app.set('trust proxy', Number(configured) || 0);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Global error handlers to prevent silent pipeline failures
process.on('unhandledRejection', (reason, promise) => {
  console.error(
    'CRITICAL: Unhandled Rejection at:',
    promise,
    'reason:',
    reason,
  );
});

process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
});

// 1. Security Headers
app.use(helmet());

// 2. Structured Request Logging (Production style)
app.use(morgan('short'));

// 3. CORS Configuration (Allowlist-based in all environments)
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
];

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const allowedOrigins = new Set(
  [...configuredOrigins, ...devOrigins, 'https://npe-solutions.vercel.app']
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim()),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl/Postman) and allowlisted browser origins.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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
app.use(express.json({ limit: '1mb' }));

// Return safe client error for malformed JSON instead of framework HTML + stack traces.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (
    err instanceof SyntaxError &&
    (err as any).status === 400 &&
    'body' in (err as any)
  ) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});

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

// Final fallback: never leak internal error details to clients.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled request error:', err);
  return res.status(500).json({ error: 'Internal Server Error.' });
});

app.listen(port, () => {
  console.log(`Notification Engine (Next+Supabase) running on port ${port}`);
});

export default app;
