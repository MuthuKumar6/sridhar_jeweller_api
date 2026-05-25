import { Router } from 'express';
import { protect } from '../middleware/auth';
import { shopController } from '../controllers/shopController';

const router = Router();
router.use(protect);

router.get('/profile',  shopController.getProfile);
router.put('/profile',  shopController.updateProfile);

export default router;