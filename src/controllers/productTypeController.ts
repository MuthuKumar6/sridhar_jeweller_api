import { Response } from 'express';
import pool from '../config/db';
import { genId } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

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
    } catch (error: any) {
      console.error('Failed to fetch product types:', error);
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
    } catch (error: any) {
      console.error('Failed to fetch product type:', error);
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
      grossWeight = 0,
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
          JSON.stringify(subNames), JSON.stringify(huids),
          grossWeight, netWeight, stoneWeight, wastagePercentage,
          makingCharges, makingChargeType, taxable, description,
          quantity, inStock
        ]
      );

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'CREATE',
        entityType: 'product_type',
        entityId: id,
        newValues: {
          productId: productId.trim(),
          name: name.trim(),
          netWeight,
          grossWeight,
          makingCharges,
          makingChargeType,
          inStock
        },
        req
      });

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

    // Fetch old values for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM product_types WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const oldValues = oldRows.length > 0 ? oldRows[0] : null;

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

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'product_type',
        entityId: String(id),
        oldValues,
        newValues: req.body,
        req
      });

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

    // Fetch old values
    const [oldRows] = await pool.execute(
      'SELECT in_stock FROM product_types WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const oldValues = oldRows.length > 0 ? oldRows[0] : null;

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

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'product_type',
        entityId: String(id),
        oldValues: { in_stock: oldValues?.in_stock },
        newValues: { change, newStock: (oldValues?.in_stock || 0) + change },
        req
      });

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

    const [oldRows] = await pool.execute(
      'SELECT * FROM product_types WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

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

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'DELETE',
        entityType: 'product_type',
        entityId: String(id),
        oldValues: oldRows[0] || null,
        req
      });

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