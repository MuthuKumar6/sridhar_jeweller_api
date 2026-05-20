import { Router } from 'express';
import { protect } from '../middleware/auth';
import { productController } from '../controllers/productController';

const router = Router();
router.use(protect);

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);

export default router;