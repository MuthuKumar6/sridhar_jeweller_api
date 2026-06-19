import { Router } from 'express';
import { protect } from '../middleware/auth';
import { billController } from '../controllers/billController';
import { validate } from '../middleware/validate';
import { createBillSchema } from '../validations/billValidation';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/bills:
 *   get:
 *     summary: Get all bills
 *     tags: [Bills]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of bills }
 */

/**
 * @swagger
 * /api/bills:
 *   post:
 *     summary: Create new bill
 *     tags: [Bills]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, subtotal, paidAmount, paymentMethod]
 *             properties:
 *               customerId: { type: string }
 *               orderId: { type: string }
 *               subtotal: { type: number }
 *               gstAmount: { type: number }
 *               discount: { type: number }
 *               paidAmount: { type: number }
 *               paymentMethod: { type: string, enum: ["cash","upi","card","cheque"] }
 *     responses:
 *       201: { description: Bill created }
 */

router.get('/', billController.getAll);
router.post('/', validate(createBillSchema), billController.create);

export default router;