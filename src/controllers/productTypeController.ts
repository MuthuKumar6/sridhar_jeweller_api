// import { Request, Response } from 'express';
// import { query, execute } from '../utils/db';
// import { genId } from '../utils/generateId';
// import { AuthRequest } from '../middleware/auth';

// export const productTypeController = {
//   // Get all product types for current shop
//   getAll: async (req: AuthRequest, res: Response) => {
//     try {
//       const shopId = req.shopId;
//       const data = await query(
//         `SELECT pt.*, p.name as productName, p.purity 
//          FROM product_types pt
//          JOIN products p ON pt.product_id = p.id
//          WHERE pt.shop_id = ? 
//          ORDER BY pt.created_at DESC`,
//         [shopId]
//       );

//       res.json({ ok: true, data });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ ok: false, error: 'Server error' });
//     }
//   },

//   // Get single product type
//   getById: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const shopId = req.shopId;

//       const [productType] = await query(
//         `SELECT pt.*, p.name as productName, p.purity, p.current_rate 
//          FROM product_types pt
//          JOIN products p ON pt.product_id = p.id
//          WHERE pt.id = ? AND pt.shop_id = ?`,
//         [id, shopId]
//       );

//       if (!productType) {
//         return res.status(404).json({ ok: false, error: 'Product type not found' });
//       }

//       res.json({ ok: true, data: productType });
//     } catch (error) {
//       res.status(500).json({ ok: false, error: 'Server error' });
//     }
//   },

//   // Create new product type
//   create: async (req: AuthRequest, res: Response) => {
//     try {
//       const shopId = req.shopId;
//       const id = genId();

//       const {
//         productId,
//         name,
//         hasSubName = false,
//         tagNo,
//         subNames = [],
//         huids = [],
//         grossWeight,
//         netWeight,
//         stoneWeight = 0,
//         wastagePercentage = 0,
//         makingCharges = 0,
//         makingChargeType = 'per_gram',
//         taxable = true,
//         description = '',
//         quantity = 0,
//         inStock = 0
//       } = req.body;

//       await execute(
//         `INSERT INTO product_types (
//           id, shop_id, product_id, name, has_sub_name, tag_no, sub_names, huids,
//           gross_weight, net_weight, stone_weight, wastage_percentage, 
//           making_charges, making_charge_type, taxable, description, 
//           quantity, in_stock
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           id, shopId, productId, name, hasSubName, tagNo,
//           JSON.stringify(subNames),
//           JSON.stringify(huids),
//           grossWeight, netWeight, stoneWeight, wastagePercentage,
//           makingCharges, makingChargeType, taxable, description,
//           quantity, inStock
//         ]
//       );

//       res.status(201).json({ 
//         ok: true, 
//         message: 'Product Type created successfully',
//         id 
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ ok: false, error: 'Failed to create product type' });
//     }
//   },

//   // Update product type
//   update: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const shopId = req.shopId;

//       const {
//         name, hasSubName, tagNo, subNames, huids, grossWeight, netWeight,
//         stoneWeight, wastagePercentage, makingCharges, makingChargeType,
//         taxable, description, quantity, inStock
//       } = req.body;

//       await execute(
//         `UPDATE product_types 
//          SET name = ?, has_sub_name = ?, tag_no = ?, sub_names = ?, huids = ?,
//              gross_weight = ?, net_weight = ?, stone_weight = ?, 
//              wastage_percentage = ?, making_charges = ?, making_charge_type = ?,
//              taxable = ?, description = ?, quantity = ?, in_stock = ?
//          WHERE id = ? AND shop_id = ?`,
//         [
//           name, hasSubName, tagNo, JSON.stringify(subNames || []), JSON.stringify(huids || []),
//           grossWeight, netWeight, stoneWeight, wastagePercentage, makingCharges,
//           makingChargeType, taxable, description, quantity, inStock, id, shopId
//         ]
//       );

//       res.json({ ok: true, message: 'Product Type updated successfully' });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ ok: false, error: 'Failed to update product type' });
//     }
//   },

//   // Update stock (important for orders)
//   updateStock: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const { change } = req.body; // e.g., -2 or +5
//       const shopId = req.shopId;

//       if (typeof change !== 'number') {
//         return res.status(400).json({ ok: false, error: 'Change must be a number' });
//       }

//       await execute(
//         'UPDATE product_types SET in_stock = in_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?',
//         [change, id, shopId]
//       );

//       res.json({ ok: true, message: 'Stock updated successfully' });
//     } catch (error) {
//       res.status(500).json({ ok: false, error: 'Failed to update stock' });
//     }
//   },

//   // Delete product type
//   delete: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const shopId = req.shopId;

//       await execute(
//         'DELETE FROM product_types WHERE id = ? AND shop_id = ?', 
//         [id, shopId]
//       );

//       res.json({ ok: true, message: 'Product Type deleted successfully' });
//     } catch (error) {
//       res.status(500).json({ ok: false, error: 'Failed to delete product type' });
//     }
//   }
// };

import { Response } from 'express';
import { genId } from '../utils/generateId';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const productTypeController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [data] = await pool.execute(
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

  getById: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [rows] = await pool.execute(
        `SELECT pt.*, p.name as productName, p.purity, p.current_rate
         FROM product_types pt
         JOIN products p ON pt.product_id = p.id
         WHERE pt.id = ? AND pt.shop_id = ?`,
        [id, shopId]
      ) as any[];

      if ((rows as any[]).length === 0) {
        return res.status(404).json({ ok: false, error: 'Product type not found' });
      }

      res.json({ ok: true, data: (rows as any[])[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const {
      productId,
      name,
      hasSubName = false,
      tagNo,
      subNames = [],
      huids = [],
      grossWeight= 0,
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

    // FIX: added required field validation (was missing entirely)
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return res.status(400).json({ ok: false, error: 'productId is required' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ ok: false, error: 'name is required' });
    }
    if (typeof netWeight !== 'number' || netWeight <= 0) {
      return res.status(400).json({ ok: false, error: 'netWeight must be a positive number' });
    }
    if (!['per_gram', 'flat', 'percentage'].includes(makingChargeType)) {
      return res.status(400).json({ ok: false, error: 'makingChargeType must be per_gram, flat, or percentage' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify the parent product belongs to this shop
      const [products] = await connection.execute(
        'SELECT id FROM products WHERE id = ? AND shop_id = ?',
        [productId.trim(), shopId]
      ) as any[];

      if ((products as any[]).length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Product not found or does not belong to this shop' });
      }

      const id = genId();

      await connection.execute(
        `INSERT INTO product_types (
          id, shop_id, product_id, name, has_sub_name, tag_no, sub_names, huids,
          gross_weight, net_weight, stone_weight, wastage_percentage,
          making_charges, making_charge_type, taxable, description,
          quantity, in_stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, shopId, productId.trim(), name.trim(), hasSubName, tagNo || null,
          JSON.stringify(subNames),
          JSON.stringify(huids),
          grossWeight, netWeight, stoneWeight, wastagePercentage,
          makingCharges, makingChargeType, taxable, description,
          quantity, inStock
        ]
      );

      await connection.commit();

      res.status(201).json({
        ok: true,
        message: 'Product type created successfully',
        id
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Product type creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create product type' });
    } finally {
      connection.release();
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const {
      name, hasSubName, tagNo, subNames, huids, grossWeight, netWeight,
      stoneWeight, wastagePercentage, makingCharges, makingChargeType,
      taxable, description, quantity, inStock
    } = req.body;

    // FIX: use a transaction and check affectedRows so we return 404 on missing record
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `UPDATE product_types
         SET name = ?, has_sub_name = ?, tag_no = ?, sub_names = ?, huids = ?,
             gross_weight = ?, net_weight = ?, stone_weight = ?,
             wastage_percentage = ?, making_charges = ?, making_charge_type = ?,
             taxable = ?, description = ?, quantity = ?, in_stock = ?,
             updated_at = NOW()
         WHERE id = ? AND shop_id = ?`,
        [
          name, hasSubName, tagNo, JSON.stringify(subNames || []), JSON.stringify(huids || []),
          grossWeight, netWeight, stoneWeight, wastagePercentage, makingCharges,
          makingChargeType, taxable, description, quantity, inStock, id, shopId
        ]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Product type not found' });
      }

      await connection.commit();
      res.json({ ok: true, message: 'Product type updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Product type update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update product type' });
    } finally {
      connection.release();
    }
  },

  updateStock: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { change } = req.body;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (typeof change !== 'number') {
      return res.status(400).json({ ok: false, error: 'change must be a number' });
    }

    // FIX: use transaction + affectedRows check so we return 404 on missing record
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'UPDATE product_types SET in_stock = in_stock + ?, updated_at = NOW() WHERE id = ? AND shop_id = ?',
        [change, id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Product type not found' });
      }

      await connection.commit();
      res.json({ ok: true, message: 'Stock updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Stock update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update stock' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    // FIX: use transaction + affectedRows check so we return 404 on missing record
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM product_types WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Product type not found' });
      }

      await connection.commit();
      res.json({ ok: true, message: 'Product type deleted successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Product type deletion failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete product type' });
    } finally {
      connection.release();
    }
  }
};