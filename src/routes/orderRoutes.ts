import { Router } from 'express';
import { protect } from '../middleware/auth';
import { orderController } from '../controllers/orderController';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from '../validations/orderValidation';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of orders with items }
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Orders]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, items]
 *             properties:
 *               customerId: { type: string }
 *               items: { type: array, items: { type: object } }
 *               notes: { type: string }
 *               paymentDueDate: { type: string, format: date }
 *     responses:
 *       201: { description: Order created successfully }
 */

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: ["pending","approved","dispatched","delivered","cancelled"] }
 *     responses:
 *       200: { description: Status updated }
 */

router.get('/', orderController.getAll);
router.post('/', validate(createOrderSchema), orderController.create);
router.patch('/:id/status', validate(updateOrderStatusSchema), orderController.updateStatus);
router.patch('/:id', validate(updateOrderSchema), orderController.update);
router.delete('/:id', orderController.delete);

export default router;