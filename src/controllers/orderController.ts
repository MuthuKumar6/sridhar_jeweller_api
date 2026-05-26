import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId, genOrderNumber } from '../utils/generateId';
import pool from '../config/db';

export const orderController = {

  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;

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

    // Group items by order in JavaScript
    const orderMap = new Map<string, any>();

    for (const row of rows) {
      const orderId = row.id;

      if (!orderMap.has(orderId)) {
        const { item_id, product_type_id, quantity, huids, weight_grams,
          rate_per_gram, making_charges, amount, ...orderData } = row;

        orderMap.set(orderId, {
          ...orderData,
          items: []
        });
      }

      // Add item if it exists (LEFT JOIN can return nulls)
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

    const ordersWithItems = Array.from(orderMap.values());

    res.json({ ok: true, data: ordersWithItems });
  },

  // create: async (req: Request, res: Response) => {
  //   const shopId = (req as any).shopId;
  //   const { customerId, items, notes = '', paymentDueDate } = req.body;

  //   // ==================== VALIDATIONS ====================
  //   if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
  //     return res.status(400).json({ ok: false, error: 'Valid customerId is required' });
  //   }

  //   if (!Array.isArray(items) || items.length === 0) {
  //     return res.status(400).json({ ok: false, error: 'At least one item is required' });
  //   }

  //   for (let i = 0; i < items.length; i++) {
  //     const item = items[i];

  //     if (!item || typeof item !== 'object') {
  //       return res.status(400).json({ ok: false, error: `Invalid item at index ${i}` });
  //     }

  //     if (!item.productTypeId || typeof item.productTypeId !== 'string') {
  //       return res.status(400).json({ ok: false, error: `productTypeId is required at item ${i}` });
  //     }

  //     if (typeof item.quantity !== 'number' || item.quantity <= 0) {
  //       return res.status(400).json({ ok: false, error: `quantity must be positive at item ${i}` });
  //     }

  //     if (typeof item.weightGrams !== 'number' || item.weightGrams <= 0) {
  //       return res.status(400).json({ ok: false, error: `weightGrams must be positive at item ${i}` });
  //     }

  //     if (typeof item.ratePerGram !== 'number' || item.ratePerGram <= 0) {
  //       return res.status(400).json({ ok: false, error: `ratePerGram must be positive at item ${i}` });
  //     }

  //     if (typeof item.makingCharges !== 'number' || item.makingCharges < 0) {
  //       return res.status(400).json({ ok: false, error: `makingCharges cannot be negative at item ${i}` });
  //     }

  //     if (item.huids !== undefined && !Array.isArray(item.huids)) {
  //       return res.status(400).json({ ok: false, error: `huids must be an array at item ${i}` });
  //     }
  //   }

  //   // paymentDueDate validation
  //   if (paymentDueDate) {
  //     const parsedDueDate = new Date(paymentDueDate);
  //     if (isNaN(parsedDueDate.getTime())) {
  //       return res.status(400).json({ ok: false, error: 'Invalid paymentDueDate format' });
  //     }
  //     if (parsedDueDate < new Date()) {
  //       return res.status(400).json({ ok: false, error: 'paymentDueDate cannot be in the past' });
  //     }
  //   }

  //   // ==================== BUSINESS LOGIC ====================
  //   const connection = await pool.getConnection();

  //   try {
  //     await connection.beginTransaction();

  //     // Verify customer belongs to shop
  //     const [customerRows] = await connection.execute(
  //       'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
  //       [customerId, shopId]
  //     ) as any[];

  //     if (customerRows.length === 0) {
  //       await connection.rollback();
  //       return res.status(400).json({ ok: false, error: 'Customer not found or does not belong to this shop' });
  //     }

  //     const orderId = genId();
  //     let orderNumber: string;
  //     let attempts = 0;
  //     const maxAttempts = 10;
  //     let generated = false;

  //     // Retry loop for unique order_number
  //     while (attempts < maxAttempts) {
  //       const [countRes] = await connection.execute(
  //         'SELECT COUNT(*) as cnt FROM orders WHERE shop_id = ?',
  //         [shopId]
  //       );

  //       const count = (countRes as any)[0].cnt;
  //       orderNumber = genOrderNumber(count + attempts);

  //       try {
  //         await connection.execute(
  //           `INSERT INTO orders (id, shop_id, order_number, customer_id, status, notes, payment_due_date)
  //            VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
  //           [orderId, shopId, orderNumber, customerId, notes, paymentDueDate]
  //         );
  //         generated = true;
  //         break;
  //       } catch (err: any) {
  //         if (err.code === 'ER_DUP_ENTRY' && err.message.includes('order_number')) {
  //           attempts++;
  //           continue;
  //         }
  //         throw err;
  //       }
  //     }

  //     if (!generated) {
  //       throw new Error('Failed to generate unique order number');
  //     }

  //     let totalWeight = 0;
  //     let subtotal = 0;

  //     // Process Items
  //     for (const item of items) {
  //       const amount = (item.weightGrams * item.ratePerGram) + item.makingCharges;
  //       subtotal += amount;
  //       totalWeight += item.weightGrams;

  //       await connection.execute(
  //         `INSERT INTO order_items (id, order_id, product_type_id, quantity, huids, 
  //           weight_grams, rate_per_gram, making_charges, amount)
  //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  //         [
  //           genId(), orderId, item.productTypeId, item.quantity,
  //           JSON.stringify(item.huids || []), item.weightGrams,
  //           item.ratePerGram, item.makingCharges, amount
  //         ]
  //       );

  //       const [result] = await connection.execute(
  //         `UPDATE product_types 
  //          SET in_stock = in_stock - ? 
  //          WHERE id = ? AND shop_id = ? AND in_stock >= ?`,
  //         [item.quantity, item.productTypeId, shopId, item.quantity]
  //       ) as any[];

  //       if (result.affectedRows === 0) {
  //         throw new Error(`Insufficient stock for product type: ${item.productTypeId}`);
  //       }
  //     }

  //     const gstAmount = subtotal * 0.03;
  //     const totalAmount = subtotal + gstAmount;

  //     await connection.execute(
  //       `UPDATE orders SET total_weight = ?, subtotal = ?, gst_amount = ?, total_amount = ?
  //        WHERE id = ?`,
  //       [totalWeight, subtotal, gstAmount, totalAmount, orderId]
  //     );

  //     await connection.commit();

  //     res.status(201).json({
  //       ok: true,
  //       orderId,
  //       totalAmount
  //     });

  //   } catch (err: any) {
  //     await connection.rollback();
  //     console.error('Order creation failed:', err);

  //     const errorMessage = err.message.includes('Insufficient stock')
  //       ? err.message
  //       : 'Order creation failed';

  //     res.status(400).json({ ok: false, error: errorMessage });
  //   } finally {
  //     connection.release();
  //   }
  // },

  // ==================== CREATE ORDER ====================
  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
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

    // paymentDueDate validation
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

      // Verify customer belongs to shop
      const [customerRows] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
        [customerId, shopId]
      ) as any[];

      if (customerRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Customer not found or does not belong to this shop' });
      }

      const orderId = genId();

      // Generate new formatted Order Number
      const orderNumber = await genOrderNumber(connection, shopId, customerId);

      // Insert Order
      await connection.execute(
        `INSERT INTO orders (id, shop_id, order_number, customer_id, status, notes, payment_due_date)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [orderId, shopId, orderNumber, customerId, notes, paymentDueDate]
      );

      let totalWeight = 0;
      let subtotal = 0;

      // Process Items
      for (const item of items) {
        const amount = (item.weightGrams * item.ratePerGram) + item.makingCharges;
        subtotal += amount;
        totalWeight += item.weightGrams;

        await connection.execute(
          `INSERT INTO order_items (id, order_id, product_type_id, quantity, huids, 
            weight_grams, rate_per_gram, making_charges, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            genId(),
            orderId,
            item.productTypeId,
            item.quantity,
            JSON.stringify(item.huids || []),
            item.weightGrams,
            item.ratePerGram,
            item.makingCharges,
            amount
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


  updateStatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const shopId = (req as any).shopId;

    if (!['pending', 'approved', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Fetch current order
      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      const order = orders[0];

      if (!order) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      // Prevent invalid transitions (optional but recommended)
      if (order.status === 'delivered' && status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({
          ok: false,
          error: 'Cannot cancel a delivered order'
        });
      }

      if (order.status === 'cancelled' && status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({
          ok: false,
          error: 'Order is already cancelled'
        });
      }

      const stockHoldingStatuses = ['pending', 'approved', 'dispatched'];
      const shouldReturnStock =
        status === 'cancelled' &&
        stockHoldingStatuses.includes(order.status);

      // Update order status
      await connection.execute(
        `UPDATE orders 
         SET status = ?, updated_at = NOW() 
         WHERE id = ? AND shop_id = ?`,
        [status, id, shopId]
      );

      // Return stock ONLY if transitioning from stock-holding status to cancelled
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

  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes, paymentDueDate, status } = req.body;
    const shopId = (req as any).shopId;

    if (!notes && paymentDueDate === undefined && !status) {
      return res.status(400).json({ ok: false, error: 'No fields to update' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if order exists
      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      const currentOrder = orders[0];

      // Build dynamic update query
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
        `UPDATE orders 
         SET ${fields.join(', ')} 
         WHERE id = ? AND shop_id = ?`,
        [...values, id, shopId]
      );

      // Handle stock return if status changed to cancelled
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


  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('DELETE FROM orders WHERE id = ? AND shop_id = ?', [id, shopId]);
      await connection.commit();
      res.json({ ok: true });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ ok: false, error: 'Failed to delete order' });
    } finally {
      connection.release();
    }
  }
};