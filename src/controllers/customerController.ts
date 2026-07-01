import { Response } from 'express';
import pool from '../config/db';
import { genId } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const customerController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [customers] = await pool.execute(
        'SELECT * FROM customers WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );
      res.json({ ok: true, data: customers });
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch customers' });
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [customers] = await pool.execute(
        'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      );

      if ((customers as any[]).length === 0) {
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      res.json({ ok: true, data: (customers as any[])[0] });
    } catch (error: any) {
      console.error('Failed to fetch customer:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch customer' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, phone, email, address, gstin } = req.body;

    if (!name?.trim() || !phone) {
      return res.status(400).json({ ok: false, error: 'Name and phone are required' });
    }

    const safeName = name.trim();
    const safePhone = phone.toString().trim();
    const safeEmail = email ? email.trim().toLowerCase() : null;
    const safeAddress = address ? address.trim() : null;
    const safeGstin = gstin ? gstin.toString().trim().toUpperCase() : null;

    // Phone validation
    if (!/^\d{10}$/.test(safePhone)) {
      return res.status(400).json({ ok: false, error: 'Phone number must be exactly 10 digits' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check for duplicate phone
      const [existing] = await connection.execute(
        'SELECT id FROM customers WHERE shop_id = ? AND phone = ?',
        [shopId, safePhone]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        return res.status(409).json({ ok: false, error: 'Customer with this phone number already exists' });
      }

      const id = genId();

      await connection.execute(
        `INSERT INTO customers (id, shop_id, name, phone, email, address, gstin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, shopId, safeName, safePhone, safeEmail, safeAddress, safeGstin]
      );

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'CREATE',
        entityType: 'customer',
        entityId: String(id),
        newValues: { name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, gstin: safeGstin },
        req
      });

      res.status(201).json({
        ok: true,
        message: 'Customer created successfully',
        data: { id, name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, gstin: safeGstin }
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create customer' });
    } finally {
      connection.release();
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, phone, email, address, gstin } = req.body;

    if (!name && !phone && !email && !address && !gstin) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }

    // Fetch old values for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const oldValues = oldRows.length > 0 ? oldRows[0] : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone.toString().trim());
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email ? email.trim().toLowerCase() : null);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address ? address.trim() : null);
      }
      if (gstin !== undefined) {
        updates.push('gstin = ?');
        values.push(gstin ? gstin.toString().trim().toUpperCase() : null);
      }

      values.push(id, shopId);

      const [result] = await connection.execute(
        `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
        values
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'customer',
        entityId: String(id),
        oldValues,
        newValues: req.body,
        req
      });

      res.json({ ok: true, message: 'Customer updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update customer' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    // Fetch old data before delete
    const [oldRows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'DELETE',
        entityType: 'customer',
        entityId: String(id),
        oldValues: oldRows[0] || null,
        req
      });

      res.json({ ok: true, message: 'Customer deleted successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer deletion failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete customer' });
    } finally {
      connection.release();
    }
  }
};