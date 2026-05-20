import { Router } from 'express';
import { protect } from '../middleware/auth';
import { billController } from '../controllers/billController';

const router = Router();
router.use(protect);

router.get('/', billController.getAll);
router.post('/', billController.create);

export default router;