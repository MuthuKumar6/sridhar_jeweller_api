import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId } from '../utils/generateId';

export const productTypeController = {
  // Get all product types for current shop
  getAll: async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).shopId;
      const data = await query(
        `SELECT pt.*, p.name as productName, p.purity 
         FROM product_types pt
         JOIN products p ON pt.product_id = p.id
         WHERE pt.shop_id = ? 
         ORDER BY pt.created_at DESC`,
        [shopId]
      );

      res.json({ ok: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  },

  // Get single product type
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const shopId = (req as any).shopId;

      const [productType] = await query(
        `SELECT pt.*, p.name as productName, p.purity, p.current_rate 
         FROM product_types pt
         JOIN products p ON pt.product_id = p.id
         WHERE pt.id = ? AND pt.shop_id = ?`,
        [id, shopId]
      );

      if (!productType) {
        return res.status(404).json({ ok: false, error: 'Product type not found' });
      }

      res.json({ ok: true, data: productType });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  },

  // Create new product type
  create: async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).shopId;
      const id = genId();

      const {
        productId,
        name,
        hasSubName = false,
        tagNo,
        subNames = [],
        huids = [],
        grossWeight,
        netWeight,
        stoneWeight = 0,
        wastagePercentage = 0,
        makingCharges = 0,
        makingChargeType = 'per_gram',
        taxable = true,
        description = '',
        quantity = 0,
        inStock = 0
      } = req.body;

      await execute(
        `INSERT INTO product_types (
          id, shop_id, product_id, name, has_sub_name, tag_no, sub_names, huids,
          gross_weight, net_weight, stone_weight, wastage_percentage, 
          making_charges, making_charge_type, taxable, description, 
          quantity, in_stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, shopId, productId, name, hasSubName, tagNo,
          JSON.stringify(subNames),
          JSON.stringify(huids),
          grossWeight, netWeight, stoneWeight, wastagePercentage,
          makingCharges, makingChargeType, taxable, description,
          quantity, inStock
        ]
      );

      res.status(201).json({ 
        ok: true, 
        message: 'Product Type created successfully',
        id 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: 'Failed to create product type' });
    }
  },

  // Update product type
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const shopId = (req as any).shopId;

      const {
        name, hasSubName, tagNo, subNames, huids, grossWeight, netWeight,
        stoneWeight, wastagePercentage, makingCharges, makingChargeType,
        taxable, description, quantity, inStock
      } = req.body;

      await execute(
        `UPDATE product_types 
         SET name = ?, has_sub_name = ?, tag_no = ?, sub_names = ?, huids = ?,
             gross_weight = ?, net_weight = ?, stone_weight = ?, 
             wastage_percentage = ?, making_charges = ?, making_charge_type = ?,
             taxable = ?, description = ?, quantity = ?, in_stock = ?
         WHERE id = ? AND shop_id = ?`,
        [
          name, hasSubName, tagNo, JSON.stringify(subNames || []), JSON.stringify(huids || []),
          grossWeight, netWeight, stoneWeight, wastagePercentage, makingCharges,
          makingChargeType, taxable, description, quantity, inStock, id, shopId
        ]
      );

      res.json({ ok: true, message: 'Product Type updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: 'Failed to update product type' });
    }
  },

  // Update stock (important for orders)
  updateStock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { change } = req.body; // e.g., -2 or +5
      const shopId = (req as any).shopId;

      if (typeof change !== 'number') {
        return res.status(400).json({ ok: false, error: 'Change must be a number' });
      }

      await execute(
        'UPDATE product_types SET in_stock = in_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?',
        [change, id, shopId]
      );

      res.json({ ok: true, message: 'Stock updated successfully' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to update stock' });
    }
  },

  // Delete product type
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const shopId = (req as any).shopId;

      await execute(
        'DELETE FROM product_types WHERE id = ? AND shop_id = ?', 
        [id, shopId]
      );

      res.json({ ok: true, message: 'Product Type deleted successfully' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to delete product type' });
    }
  }
};