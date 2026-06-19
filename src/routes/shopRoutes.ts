import { Router } from 'express';
import { protect } from '../middleware/auth';
import { shopController } from '../controllers/shopController';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../validations/shopValidation';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/shop/profile:
 *   get:
 *     summary: Get current shop profile
 *     tags: [Shop]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Shop profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/shop/profile:
 *   put:
 *     summary: Update shop profile
 *     tags: [Shop]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName: { type: string }
 *               ownerName: { type: string }
 *               phone: { type: string }
 *               gstin: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               pincode: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

router.get('/profile',  shopController.getProfile);
router.put('/profile', validate(updateProfileSchema), shopController.updateProfile);

export default router;