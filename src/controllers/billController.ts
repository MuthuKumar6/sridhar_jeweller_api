import { Response } from 'express';
import { genId, genBillNumber } from '../utils/generateId';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const billController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [data] = await pool.execute(
        'SELECT * FROM bills WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );
      res.json({ ok: true, data });
    } catch (error: any) {
      console.error('Failed to fetch bills:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch bills' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const {
      orderId,
      customerId,
      subtotal,
      gstAmount,
      discount = 0,
      paidAmount,
      paymentMethod
    } = req.body;

    // ==================== VALIDATIONS ====================
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Valid customerId is required' });
    }
    if (typeof subtotal !== 'number' || subtotal < 0) {
      return res.status(400).json({ ok: false, error: 'subtotal must be a valid positive number' });
    }
    if (typeof gstAmount !== 'number' || gstAmount < 0) {
      return res.status(400).json({ ok: false, error: 'gstAmount must be a valid non-negative number' });
    }
    if (typeof discount !== 'number' || discount < 0) {
      return res.status(400).json({ ok: false, error: 'discount cannot be negative' });
    }
    if (typeof paidAmount !== 'number' || paidAmount < 0) {
      return res.status(400).json({ ok: false, error: 'paidAmount must be a valid non-negative number' });
    }
    if (!paymentMethod || !['cash', 'online', 'card', 'upi', 'cheque'].includes(paymentMethod)) {
      return res.status(400).json({
        ok: false,
        error: 'Valid paymentMethod is required (cash, online, card, upi, cheque)'
      });
    }
    if (orderId && typeof orderId !== 'string') {
      return res.status(400).json({ ok: false, error: 'orderId must be a string if provided' });
    }

    const totalAmount = subtotal + gstAmount - discount;
    if (paidAmount > totalAmount) {
      return res.status(400).json({ ok: false, error: 'paidAmount cannot exceed totalAmount' });
    }
    const balanceAmount = totalAmount - paidAmount;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Duplicate bill guard
      if (orderId) {
        const [existingBill] = await connection.execute(
          'SELECT id, bill_number FROM bills WHERE shop_id = ? AND order_id = ?',
          [shopId, orderId]
        ) as any[];

        if (existingBill.length > 0) {
          await connection.rollback();
          return res.status(409).json({
            ok: false,
            error: 'A bill has already been created for this order',
            existingBill: existingBill[0]
          });
        }
      }

      // Verify customer
      const [customer] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
        [customerId, shopId]
      ) as any[];

      if (customer.length === 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Customer not found or does not belong to this shop' });
      }

      // Verify order (if provided)
      if (orderId) {
        const [order] = await connection.execute(
          'SELECT id FROM orders WHERE id = ? AND shop_id = ?',
          [orderId, shopId]
        ) as any[];

        if (order.length === 0) {
          await connection.rollback();
          return res.status(400).json({ ok: false, error: 'Order not found or does not belong to this shop' });
        }
      }

      const billId = genId();
      const billNumber = await genBillNumber(connection, shopId, customerId);

      await connection.execute(
        `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal,
                gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billId, shopId, billNumber, orderId || null, customerId,
          subtotal, gstAmount, discount, totalAmount, paidAmount, balanceAmount,
          paymentMethod, balanceAmount > 0 ? 'partial' : 'paid'
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
        entityType: 'bill',
        entityId: billId,
        newValues: {
          billNumber,
          customerId,
          orderId: orderId || null,
          subtotal,
          gstAmount,
          discount,
          totalAmount,
          paidAmount,
          balanceAmount,
          paymentMethod
        },
        req
      });

      res.status(201).json({
        ok: true,
        billId,
        billNumber,
        totalAmount,
        balanceAmount
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Bill creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create bill' });
    } finally {
      connection.release();
    }
  }
};