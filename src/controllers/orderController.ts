import { Response } from 'express';
import { query } from '../utils/db';
import { genId, genOrderNumber } from '../utils/generateId';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const orderController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    // FIX: added missing auth guard (was the only controller without it)
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const rows = await query(
        `SELECT 
          o.*,
          oi.id AS item_id,
          oi.product_type_id,
          oi.quantity,
          oi.huids,
          oi.weight_grams,
          oi.rate_per_gram,
          oi.making_charges,
          oi.amount
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.shop_id = ?
         ORDER BY o.created_at DESC, o.id, oi.id ASC`,
        [shopId]
      ) as any[];

      const orderMap = new Map<string, any>();

      for (const row of rows) {
        const orderId = row.id;

        if (!orderMap.has(orderId)) {
          const { item_id, product_type_id, quantity, huids, weight_grams,
            rate_per_gram, making_charges, amount, ...orderData } = row;

          orderMap.set(orderId, { ...orderData, items: [] });
        }

        if (row.item_id) {
          const order = orderMap.get(orderId);
          order.items.push({
            id: row.item_id,
            product_type_id: row.product_type_id,
            quantity: row.quantity,
            huids: JSON.parse(row.huids || '[]'),
            weight_grams: row.weight_grams,
            rate_per_gram: row.rate_per_gram,
            making_charges: row.making_charges,
            amount: row.amount,
          });
        }
      }

      res.json({ ok: true, data: Array.from(orderMap.values()) });
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { customerId, items, notes = '', paymentDueDate } = req.body;

    // ==================== VALIDATIONS ====================
    if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
      return res.status(400).json({ ok: false, error: 'Valid customerId is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'At least one item is required' });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item || typeof item !== 'object') {
        return res.status(400).json({ ok: false, error: `Invalid item at index ${i}` });
      }
      if (!item.productTypeId || typeof item.productTypeId !== 'string') {
        return res.status(400).json({ ok: false, error: `productTypeId is required at item ${i}` });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ ok: false, error: `quantity must be positive at item ${i}` });
      }
      if (typeof item.weightGrams !== 'number' || item.weightGrams <= 0) {
        return res.status(400).json({ ok: false, error: `weightGrams must be positive at item ${i}` });
      }
      if (typeof item.ratePerGram !== 'number' || item.ratePerGram <= 0) {
        return res.status(400).json({ ok: false, error: `ratePerGram must be positive at item ${i}` });
      }
      if (typeof item.makingCharges !== 'number' || item.makingCharges < 0) {
        return res.status(400).json({ ok: false, error: `makingCharges cannot be negative at item ${i}` });
      }
      if (item.huids !== undefined && !Array.isArray(item.huids)) {
        return res.status(400).json({ ok: false, error: `huids must be an array at item ${i}` });
      }
    }

    if (paymentDueDate) {
      const parsedDueDate = new Date(paymentDueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ ok: false, error: 'Invalid paymentDueDate format' });
      }
      if (parsedDueDate < new Date()) {
        return res.status(400).json({ ok: false, error: 'paymentDueDate cannot be in the past' });
      }
    }

    // ==================== BUSINESS LOGIC ====================
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [customerRows] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
        [customerId, shopId]
      ) as any[];

      if (customerRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Customer not found or does not belong to this shop' });
      }

      const orderId = genId();
      const orderNumber = await genOrderNumber(connection, shopId, customerId);

      await connection.execute(
        `INSERT INTO orders (id, shop_id, order_number, customer_id, status, notes, payment_due_date)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [orderId, shopId, orderNumber, customerId, notes, paymentDueDate]
      );

      let totalWeight = 0;
      let subtotal = 0;

      for (const item of items) {
        const amount = (item.weightGrams * item.ratePerGram) + item.makingCharges;
        subtotal += amount;
        totalWeight += item.weightGrams;

        await connection.execute(
          `INSERT INTO order_items (id, order_id, product_type_id, quantity, huids,
            weight_grams, rate_per_gram, making_charges, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            genId(), orderId, item.productTypeId, item.quantity,
            JSON.stringify(item.huids || []), item.weightGrams,
            item.ratePerGram, item.makingCharges, amount
          ]
        );

        const [result] = await connection.execute(
          `UPDATE product_types
           SET in_stock = in_stock - ?
           WHERE id = ? AND shop_id = ? AND in_stock >= ?`,
          [item.quantity, item.productTypeId, shopId, item.quantity]
        ) as any[];

        if (result.affectedRows === 0) {
          throw new Error(`Insufficient stock for product type: ${item.productTypeId}`);
        }
      }

      const gstAmount = subtotal * 0.03;
      const totalAmount = subtotal + gstAmount;

      await connection.execute(
        `UPDATE orders SET total_weight = ?, subtotal = ?, gst_amount = ?, total_amount = ?
         WHERE id = ?`,
        [totalWeight, subtotal, gstAmount, totalAmount, orderId]
      );

      await connection.commit();

      res.status(201).json({
        ok: true,
        message: 'Order created successfully',
        orderId,
        orderNumber,
        totalAmount
      });
    } catch (err: any) {
      await connection.rollback();
      console.error('Order creation failed:', err);

      const errorMessage = err.message.includes('Insufficient stock')
        ? err.message
        : 'Order creation failed';

      res.status(400).json({ ok: false, error: errorMessage });
    } finally {
      connection.release();
    }
  },

  updateStatus: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (!['pending', 'approved', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      const order = orders[0];
      if (!order) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      if (order.status === 'delivered' && status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Cannot cancel a delivered order' });
      }

      if (order.status === 'cancelled' && status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Order is already cancelled' });
      }

      const stockHoldingStatuses = ['pending', 'approved', 'dispatched'];
      const shouldReturnStock = status === 'cancelled' && stockHoldingStatuses.includes(order.status);

      await connection.execute(
        `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? AND shop_id = ?`,
        [status, id, shopId]
      );

      if (shouldReturnStock) {
        const [items] = await connection.execute(
          'SELECT * FROM order_items WHERE order_id = ?',
          [id]
        ) as any[];

        for (const item of items) {
          await connection.execute(
            'UPDATE product_types SET in_stock = in_stock + ? WHERE id = ? AND shop_id = ?',
            [item.quantity, item.product_type_id, shopId]
          );
        }
      }

      await connection.commit();

      res.json({
        ok: true,
        message: 'Order status updated successfully',
        previousStatus: order.status,
        newStatus: status
      });
    } catch (err: any) {
      await connection.rollback();
      console.error('Order status update failed:', err);
      res.status(500).json({ ok: false, error: 'Failed to update order status' });
    } finally {
      connection.release();
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { notes, paymentDueDate, status } = req.body;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (!notes && paymentDueDate === undefined && !status) {
      return res.status(400).json({ ok: false, error: 'No fields to update' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      const currentOrder = orders[0];

      const fields: string[] = [];
      const values: any[] = [];

      if (notes !== undefined) {
        fields.push('notes = ?');
        values.push(notes);
      }
      if (paymentDueDate !== undefined) {
        fields.push('payment_due_date = ?');
        values.push(paymentDueDate || null);
      }
      if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
      }

      fields.push('updated_at = NOW()');

      await connection.execute(
        `UPDATE orders SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`,
        [...values, id, shopId]
      );

      if (status === 'cancelled') {
        const stockHoldingStatuses = ['pending', 'approved', 'dispatched'];
        if (stockHoldingStatuses.includes(currentOrder.status)) {
          const [items] = await connection.execute(
            'SELECT * FROM order_items WHERE order_id = ?',
            [id]
          ) as any[];

          for (const item of items) {
            await connection.execute(
              'UPDATE product_types SET in_stock = in_stock + ? WHERE id = ? AND shop_id = ?',
              [item.quantity, item.product_type_id, shopId]
            );
          }
        }
      }

      await connection.commit();
      res.json({ ok: true, message: 'Order updated successfully' });
    } catch (err: any) {
      await connection.rollback();
      console.error('Order update failed:', err);
      res.status(500).json({ ok: false, error: 'Failed to update order' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // FIX: check order exists and belongs to shop
      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      const order = orders[0];

      // FIX: restore stock if order was holding inventory
      const stockHoldingStatuses = ['pending', 'approved', 'dispatched'];
      if (stockHoldingStatuses.includes(order.status)) {
        const [items] = await connection.execute(
          'SELECT * FROM order_items WHERE order_id = ?',
          [id]
        ) as any[];

        for (const item of items) {
          await connection.execute(
            'UPDATE product_types SET in_stock = in_stock + ? WHERE id = ? AND shop_id = ?',
            [item.quantity, item.product_type_id, shopId]
          );
        }
      }

      await connection.execute('DELETE FROM orders WHERE id = ? AND shop_id = ?', [id, shopId]);
      await connection.commit();

      res.json({ ok: true, message: 'Order deleted successfully' });
    } catch (err) {
      await connection.rollback();
      console.error('Order deletion failed:', err);
      res.status(500).json({ ok: false, error: 'Failed to delete order' });
    } finally {
      connection.release();
    }
  }
};