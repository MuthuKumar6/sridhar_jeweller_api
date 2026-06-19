import { Router } from 'express';
import { protect } from '../middleware/auth';
import { productController } from '../controllers/productController';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema } from '../validations/productValidation';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of products }
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product details }
 *       404: { description: Product not found }
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, purity, currentRate]
 *             properties:
 *               name: { type: string }
 *               purity: { type: string }
 *               currentRate: { type: number }
 *               gstPercentage: { type: number, default: 3 }
 *     responses:
 *       201: { description: Product created }
 */

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
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
 *               purity: { type: string }
 *               currentRate: { type: number }
 *               gstPercentage: { type: number }
 *     responses:
 *       200: { description: Product updated }
 */

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product deleted }
 *       404: { description: Product not found }
 */

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validate(createProductSchema), productController.create);
router.put('/:id', validate(updateProductSchema), productController.update);
router.delete('/:id', productController.delete);

export default router;