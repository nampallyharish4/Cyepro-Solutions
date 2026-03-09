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
router.get('/analytics', authMiddleware, NotificationController.getAnalytics);
router.get('/settings', authMiddleware, NotificationController.getSettings);
router.post('/settings', authMiddleware, adminOnly, NotificationController.updateSettings);
router.post('/rules/dry-run', authMiddleware, NotificationController.dryRunRule);

export default router;
