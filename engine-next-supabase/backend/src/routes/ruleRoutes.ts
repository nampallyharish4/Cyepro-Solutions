import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, NotificationController.getRules);
router.post('/', authMiddleware, adminOnly, NotificationController.createRule);
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  NotificationController.updateRule,
);
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  NotificationController.deleteRule,
);

export default router;
