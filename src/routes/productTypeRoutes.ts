import { Router } from 'express';
import { protect } from '../middleware/auth';
import { productTypeController } from '../controllers/productTypeController';

const router = Router();

// All routes are protected (requires authentication)
router.use(protect);

// ==================== CRUD Routes ====================

// Get all product types
router.get('/', productTypeController.getAll);

// Get single product type by ID
router.get('/:id', productTypeController.getById);

// Create new product type
router.post('/', productTypeController.create);

// Update product type
router.put('/:id', productTypeController.update);

// Update stock (special endpoint)
router.put('/:id/stock', productTypeController.updateStock);

// Delete product type
router.delete('/:id', productTypeController.delete);

export default router;