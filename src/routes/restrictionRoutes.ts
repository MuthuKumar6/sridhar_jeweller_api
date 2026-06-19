import { Router } from 'express';
import { protect } from '../middleware/auth';
import { restrictionController } from '../controllers/restrictionController';
import { checkLimitSchema, createRestrictionSchema, updateRestrictionSchema } from '../validations/restrictionValidation';
import { validate } from '../middleware/validate';
import { updateCustomerSchema } from '../validations/customerValidation';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/restrictions:
 *   get:
 *     summary: Get all restrictions
 *     tags: [Restrictions]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of restrictions }
 */

/**
 * @swagger
 * /api/restrictions:
 *   post:
 *     summary: Create restriction (daily gram limit)
 *     tags: [Restrictions]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, productId, dailyGramLimit]
 *             properties:
 *               customerId: { type: string }
 *               productId: { type: string }
 *               dailyGramLimit: { type: number }
 *     responses:
 *       201: { description: Restriction created }
 */

/**
 * @swagger
 * /api/restrictions/check:
 *   post:
 *     summary: Check if order violates daily limit
 *     tags: [Restrictions]
 *     security: [ BearerAuth: [] ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, productId, grams]
 *             properties:
 *               customerId: { type: string }
 *               productId: { type: string }
 *               grams: { type: number }
 *     responses:
 *       200: { description: Limit check result }
 */

router.get('/', restrictionController.getAll);
router.post('/', validate(createRestrictionSchema), restrictionController.create);
router.post('/check', validate(checkLimitSchema), restrictionController.checkLimit);
router.delete('/:id', restrictionController.delete);
router.put('/:id', validate(updateRestrictionSchema), restrictionController.update);

export default router;