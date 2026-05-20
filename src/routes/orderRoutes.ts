import { Router } from 'express';
import { protect } from '../middleware/auth';
import { orderController } from '../controllers/orderController';

const router = Router();
router.use(protect);

router.get('/', orderController.getAll);
router.post('/', orderController.create);
router.patch('/:id/status', orderController.updateStatus);
router.delete('/:id', orderController.delete);

export default router;