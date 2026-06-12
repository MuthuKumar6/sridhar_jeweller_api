import { Router } from 'express';
import { protect } from '../middleware/auth';
import { restrictionController } from '../controllers/restrictionController';

const router = Router();
router.use(protect);

router.get('/', restrictionController.getAll);
router.post('/', restrictionController.create);
router.post('/check', restrictionController.checkLimit);
router.delete('/:id', restrictionController.delete);
router.put('/:id', restrictionController.update);

export default router;