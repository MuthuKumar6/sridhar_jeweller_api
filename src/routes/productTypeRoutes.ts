import { Router } from 'express';
import { protect } from '../middleware/auth';
import { productTypeController } from '../controllers/productTypeController';
import { createProductTypeSchema, } from '../validations/productTypeValidation';
import { validate } from '../middleware/validate';

const router = Router();

// All routes are protected (requires authentication)
router.use(protect);

/**
 * @swagger
 * /api/product-types:
 *   get:
 *     summary: Get all product types
 *     tags: [Product Types]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of product types with product info }
 */

/**
 * @swagger
 * /api/product-types/{id}:
 *   get:
 *     summary: Get single product type
 *     tags: [Product Types]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product type details }
 */

/**
 * @swagger
 * /api/product-types:
 *   post:
 *     summary: Create new product type
 *     tags: [Product Types]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, name, netWeight]
 *             properties:
 *               productId: { type: string }
 *               name: { type: string }
 *               netWeight: { type: number }
 *               grossWeight: { type: number }
 *               makingCharges: { type: number }
 *               inStock: { type: number, default: 0 }
 *     responses:
 *       201: { description: Product type created }
 */

/**
 * @swagger
 * /api/product-types/{id}:
 *   put:
 *     summary: Update product type
 *     tags: [Product Types]
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
 *               netWeight: { type: number }
 *               inStock: { type: number }
 *     responses:
 *       200: { description: Updated successfully }
 */

/**
 * @swagger
 * /api/product-types/{id}/stock:
 *   patch:
 *     summary: Update stock quantity
 *     tags: [Product Types]
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
 *             required: [change]
 *             properties:
 *               change: { type: number, example: -5 }
 *     responses:
 *       200: { description: Stock updated }
 */

/**
 * @swagger
 * /api/product-types/{id}:
 *   delete:
 *     summary: Delete product type
 *     tags: [Product Types]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted successfully }
 */

// ==================== CRUD Routes ====================

// Get all product types
router.get('/', productTypeController.getAll);

// Get single product type by ID
router.get('/:id', productTypeController.getById);

// Create new product type
router.post('/', validate(createProductTypeSchema), productTypeController.create);

// Update product type
router.put('/:id', productTypeController.update);

// Update stock (special endpoint)
router.patch('/:id/stock', productTypeController.updateStock);

// Delete product type
router.delete('/:id', productTypeController.delete);

export default router;