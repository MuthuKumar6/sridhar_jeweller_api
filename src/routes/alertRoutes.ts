import { Router } from 'express';
import { protect } from '../middleware/auth';
import { alertController } from '../controllers/alertController';

const router = Router();
router.use(protect);

router.get('/', alertController.getAll);
router.get('/unread', alertController.getUnread);
router.put('/:id/read', alertController.markRead);
router.put('/mark-all-read', alertController.markAllRead);

export default router;