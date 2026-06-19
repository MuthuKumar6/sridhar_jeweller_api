import { Router } from 'express';
import { protect } from '../middleware/auth';
import { alertController } from '../controllers/alertController';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect);

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all stock alerts
 *     tags: [Alerts]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: List of alerts }
 */

/**
 * @swagger
 * /api/alerts/unread:
 *   get:
 *     summary: Get unread alerts
 *     tags: [Alerts]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: Unread alerts }
 */

/**
 * @swagger
 * /api/alerts/mark-all-read:
 *   put:
 *     summary: Mark all alerts as read
 *     tags: [Alerts]
 *     security: [ BearerAuth: [] ]
 *     responses:
 *       200: { description: All alerts marked read }
 */

/**
 * @swagger
 * /api/alerts/{id}/read:
 *   patch:
 *     summary: Mark single alert as read
 *     tags: [Alerts]
 *     security: [ BearerAuth: [] ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Alert marked as read }
 */

router.get('/', alertController.getAll);
router.get('/unread', alertController.getUnread);
router.put('/mark-all-read', alertController.markAllRead);
router.patch('/:id/read', alertController.markRead);


export default router;