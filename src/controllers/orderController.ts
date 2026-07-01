import { Response } from 'express';
import pool from '../config/db';
import { genId, genOrderNumber } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const orderController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [orders] = await pool.execute(
        `SELECT o.*, c.name as customerName,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as itemCount
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.shop_id = ?
         ORDER BY o.created_at DESC`,
        [shopId]
      );
      res.json({ ok: true, data: orders });
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { customerId, items, notes, paymentDueDate } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Customer and at least one item are required' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify customer belongs to shop
      const [customerCheck] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
        [customerId, shopId]
      ) as any[];

      if (customerCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      const orderId = genId();
      const orderNumber = await genOrderNumber(connection, shopId, customerId);

      // Create Order
      await connection.execute(
        `INSERT INTO orders (id, shop_id, customer_id, order_number, notes, payment_due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [orderId, shopId, customerId, orderNumber, notes || null, paymentDueDate || null]
      );

      // Create Order Items
      for (const item of items) {
        await connection.execute(
          `INSERT INTO order_items (id, order_id, product_type_id, quantity, weight_grams, 
                                    rate_per_gram, making_charges, huids)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            genId(),
            orderId,
            item.productTypeId,
            item.quantity,
            item.weightGrams,
            item.ratePerGram,
            item.makingCharges || 0,
            JSON.stringify(item.huids || [])
          ]
        );
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'CREATE',
        entityType: 'order',
        entityId: orderId,
        newValues: {
          orderNumber,
          customerId,
          itemCount: items.length,
          totalItems: items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0),
          notes
        },
        req
      });

      res.status(201).json({
        ok: true,
        message: 'Order created successfully',
        data: { id: orderId, orderNumber }
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Order creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create order' });
    } finally {
      connection.release();
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { notes, paymentDueDate, status } = req.body;

    // Fetch old order for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    if (oldRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const oldValues = oldRows[0];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `UPDATE orders 
         SET notes = ?, payment_due_date = ?, status = ?, updated_at = NOW()
         WHERE id = ? AND shop_id = ?`,
        [notes || oldValues.notes, paymentDueDate || oldValues.payment_due_date,
        status || oldValues.status, id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'order',
        entityId: String(id),
        oldValues,
        newValues: { notes, paymentDueDate, status },
        req
      });

      res.json({ ok: true, message: 'Order updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Order update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update order' });
    } finally {
      connection.release();
    }
  },

  updateStatus: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { status } = req.body;

    if (!['pending', 'approved', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    // Fetch old status
    const [oldRows] = await pool.execute(
      'SELECT status FROM orders WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    if (oldRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? AND shop_id = ?',
        [status, id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'order',
        entityId: String(id),
        oldValues: { status: oldRows[0].status },
        newValues: { status },
        req
      });

      res.json({ ok: true, message: `Order status updated to ${status}` });
    } catch (error: any) {
      await connection.rollback();
      console.error('Order status update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update order status' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const [oldRows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    if (oldRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete order items first
      await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id]);

      // Delete order
      const [result] = await connection.execute(
        'DELETE FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'DELETE',
        entityType: 'order',
        entityId: String(id),
        oldValues: oldRows[0],
        req
      });

      res.json({ ok: true, message: 'Order deleted successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Order deletion failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete order' });
    } finally {
      connection.release();
    }
  }
};