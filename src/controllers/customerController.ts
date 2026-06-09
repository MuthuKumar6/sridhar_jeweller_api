import { Request, Response } from 'express';
import { genId } from '../utils/generateId';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const customerController = {
  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;

    try {
      const [data] = await pool.execute(
        'SELECT * FROM customers WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );

      res.json({ ok: true, data });
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch customers' });
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;

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
    const { name, phone, email, address, gstin, dailyGramLimit = 0 } = req.body;

    // ==================== VALIDATIONS ====================

    // 1. Name
    if (!name?.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Customer name is required'
      });
    }
    const safeName = name.trim();
    if (safeName.length < 2 || safeName.length > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Customer name must be between 2 and 100 characters'
      });
    }

    // 2. Phone (Required + Format)
    if (!phone?.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Phone number is required'
      });
    }
    const safePhone = phone.toString().trim();
    const phoneRegex = /^\d{10}$/; // 10 digits (India standard)
    if (!phoneRegex.test(safePhone)) {
      return res.status(400).json({
        ok: false,
        error: 'Phone number must be exactly 10 digits (e.g., 9876543210)'
      });
    }

    // 3. Email (Optional)
    let safeEmail: string | null = null;
    if (email) {
      const emailStr = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return res.status(400).json({
          ok: false,
          error: 'Please provide a valid email address'
        });
      }
      safeEmail = emailStr;
    }

    // 4. GSTIN (Optional - Indian GSTIN format)
    let safeGstin: string | null = null;
    if (gstin) {
      const gstinStr = gstin.toString().trim().toUpperCase();
      // GSTIN Format: 15 characters (e.g., 22AAAAA0000A1Z5)
      const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

      if (!gstinRegex.test(gstinStr)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid GSTIN format. Example: 22AAAAA0000A1Z5'
        });
      }
      safeGstin = gstinStr;
    }

    // 5. Address (Optional)
    const safeAddress = address ? address.toString().trim() : null;
    if (safeAddress && safeAddress.length > 500) {
      return res.status(400).json({
        ok: false,
        error: 'Address cannot exceed 500 characters'
      });
    }

    // 6. Daily Gram Limit
    const safeDailyGramLimit = typeof dailyGramLimit === 'number' && dailyGramLimit >= 0
      ? dailyGramLimit
      : 0;

    // ==================== BUSINESS LOGIC ====================

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const id = genId();

      // Check for duplicate phone in the same shop
      const [existing] = await connection.execute(
        'SELECT id FROM customers WHERE shop_id = ? AND phone = ?',
        [shopId, safePhone]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          error: 'Customer with this phone already exists'
        });
      }

      // Insert customer
      await connection.execute(
        `INSERT INTO customers (id, shop_id, name, phone, email, address, gstin, daily_gram_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, shopId, safeName, safePhone, safeEmail, safeAddress, safeGstin, safeDailyGramLimit]
      );

      await connection.commit();

      res.status(201).json({
        ok: true,
        data: {
          id,
          name: safeName,
          phone: safePhone,
          email: safeEmail,
          address: safeAddress,
          gstin: safeGstin,
          dailyGramLimit: safeDailyGramLimit
        }
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
    const { name, phone, email, address, gstin, dailyGramLimit } = req.body;

    if (!name?.trim() && !phone?.trim()) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const safeName = name ? name.trim() : undefined;
      const safePhone = phone ? phone.trim() : undefined;
      const safeEmail = email ? email.trim().toLowerCase() : undefined;
      const safeAddress = address ? address.trim() : undefined;
      const safeGstin = gstin ? gstin.trim().toUpperCase() : undefined;

      // Optional duplicate phone check (if phone is being updated)
      if (safePhone) {
        const [existing] = await connection.execute(
          'SELECT id FROM customers WHERE shop_id = ? AND phone = ? AND id != ?',
          [shopId, safePhone, id]
        );

        if ((existing as any[]).length > 0) {
          await connection.rollback();
          return res.status(409).json({ ok: false, error: 'Phone number already used by another customer' });
        }
      }

      await connection.execute(
        `UPDATE customers 
         SET name = ?, phone = ?, email = ?, address = ?, gstin = ?, daily_gram_limit = ?
         WHERE id = ? AND shop_id = ?`,
        [
          safeName || null,
          safePhone || null,
          safeEmail || null,
          safeAddress || null,
          safeGstin || null,
          dailyGramLimit,
          id,
          shopId
        ]
      );

      await connection.commit();
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

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Check if customer exists and belongs to the shop
      const [customer] = await connection.execute(
        'SELECT id, name FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (customer.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          ok: false,
          error: 'Customer not found'
        });
      }

      const customerName = customer[0].name;

      // 2. Check for related records (Prevent cascade or foreign key errors)
      const [ordersCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      const [billsCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM bills WHERE customer_id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      const orderCount = ordersCount[0].count;
      const billCount = billsCount[0].count;

      if (orderCount > 0 || billCount > 0) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          error: `Cannot delete customer "${customerName}"`,
          reason: 'Active records exist',
          details: {
            orders: orderCount,
            bills: billCount
          },
          message: `This customer has ${orderCount} order(s) and ${billCount} bill(s). ` +
            `Please delete the orders/bills first or archive this customer instead.`
        });
      }

      // 3. Safe to delete
      const [result] = await connection.execute(
        'DELETE FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      await connection.commit();

      res.json({
        ok: true,
        message: `Customer "${customerName}" deleted successfully`
      });

    } catch (error: any) {
      await connection.rollback();
      console.error('Customer deletion failed:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete customer'
      });
    } finally {
      connection.release();
    }
  }
};