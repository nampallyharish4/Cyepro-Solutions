import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.post(
  '/notifications',
  authMiddleware,
  NotificationController.submitEvent,
);
router.get('/metrics', authMiddleware, NotificationController.getMetrics);
router.get(
  '/metrics/timeline',
  authMiddleware,
  NotificationController.getMetricsTimeline,
);
router.get('/audit', authMiddleware, NotificationController.getAuditLogs);

export default router;
