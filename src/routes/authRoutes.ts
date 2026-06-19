import { Router } from 'express';
import { signup, login } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema, signupSchema } from '../validations/authValidation';

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new shop
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopName, email, password]
 *             properties:
 *               shopName: { type: string, example: "Sridhar Jewellers" }
 *               ownerName: { type: string, example: "Mr. Sridhar" }
 *               email: { type: string, format: email, example: "owner@sridhar.com" }
 *               phone: { type: string, example: "9876543210" }
 *               password: { type: string, example: "StrongPass123" }
 *     responses:
 *       201:
 *         description: Shop registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to shop account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "owner@sridhar.com" }
 *               password: { type: string, example: "StrongPass123" }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

export default router;