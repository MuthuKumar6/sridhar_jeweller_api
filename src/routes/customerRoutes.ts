import { Router } from 'express';
import { protect } from '../middleware/auth';
import { customerController } from '../controllers/customerController';
import { validate } from '../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from '../validations/customerValidation';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of customers }
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Customer details }
 */

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create new customer
 *     tags: [Customers]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               gstin: { type: string }
 *     responses:
 *       201: { description: Customer created }
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       200: { description: Customer updated }
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Customer deleted }
 */

router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.post('/', validate(createCustomerSchema), customerController.create);
router.put('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', customerController.delete);

export default router;