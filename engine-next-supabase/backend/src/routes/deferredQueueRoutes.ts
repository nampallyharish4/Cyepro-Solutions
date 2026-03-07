import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, NotificationController.getDeferredQueue);
router.post('/:id/force-send', authMiddleware, adminOnly, NotificationController.forceSendDeferred);

export default router;
