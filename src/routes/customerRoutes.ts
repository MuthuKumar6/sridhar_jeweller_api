import { Router } from 'express';
import { protect } from '../middleware/auth';
import { customerController } from '../controllers/customerController';

const router = Router();
router.use(protect);

router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.delete);

export default router;