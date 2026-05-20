import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId, genOrderNumber } from '../utils/generateId';

export const orderController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;

    const orders = await query(
      'SELECT * FROM orders WHERE shop_id = ? ORDER BY created_at DESC',
      [shopId]
    ) as any[];

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        ) as any[];

        return {
          ...order,
          items: items.map(item => ({
            ...item,
            huids: JSON.parse(item.huids || '[]'),  // parse back from JSON string
          })),
        };
      })
    );

    res.json({ ok: true, data: ordersWithItems });
  },

  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const { customerId, items, notes = '', paymentDueDate } = req.body;

    // Generate Order Number
    const countRes = await query('SELECT COUNT(*) as cnt FROM orders WHERE shop_id = ?', [shopId]);
    const orderNumber = genOrderNumber((countRes as any)[0].cnt);

    const orderId = genId();
    let totalWeight = 0;
    let subtotal = 0;
    let gstAmount = 0;

    // Create Order
    await execute(
      `INSERT INTO orders (id, shop_id, order_number, customer_id, status, notes, payment_due_date)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [orderId, shopId, orderNumber, customerId, notes, paymentDueDate]
    );

    // Process Items
    for (const item of items) {
      const amount = (item.weightGrams * item.ratePerGram) + item.makingCharges;
      subtotal += amount;
      totalWeight += item.weightGrams;

      await execute(
        `INSERT INTO order_items (id, order_id, product_type_id, quantity, huids, 
          weight_grams, rate_per_gram, making_charges, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          genId(), orderId, item.productTypeId, item.quantity,
          JSON.stringify(item.huids || []), item.weightGrams,
          item.ratePerGram, item.makingCharges, amount
        ]
      );

      // Deduct Stock
      await execute(
        'UPDATE product_types SET in_stock = in_stock - ? WHERE id = ? AND shop_id = ?',
        [item.quantity, item.productTypeId, shopId]
      );
    }

    gstAmount = subtotal * 0.03; // 3% GST
    const totalAmount = subtotal + gstAmount;

    // Update Order Totals
    await execute(
      `UPDATE orders SET total_weight = ?, subtotal = ?, gst_amount = ?, total_amount = ?
       WHERE id = ?`,
      [totalWeight, subtotal, gstAmount, totalAmount, orderId]
    );

    res.status(201).json({
      ok: true,
      orderId,
      orderNumber,
      totalAmount
    });
  },

  updateStatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const shopId = (req as any).shopId;

    console.log('Updating order status:', { id, status, shopId });

    const [order] = await query('SELECT * FROM orders WHERE id = ? AND shop_id = ?', [id, shopId]);

    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    await execute('UPDATE orders SET status = ? WHERE id = ? AND shop_id = ?', [status, id, shopId]);

    // If cancelled, return stock
    if (status === 'cancelled') {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);
      for (const item of items as any[]) {
        await execute(
          'UPDATE product_types SET in_stock = in_stock + ? WHERE id = ? AND shop_id = ?',
          [item.quantity, item.product_type_id, shopId]
        );
      }
    }

    res.json({ ok: true, message: 'Order status updated' });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    await execute('DELETE FROM orders WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true });
  }
};