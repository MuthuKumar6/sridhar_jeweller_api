import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId, genBillNumber } from '../utils/generateId';

export const billController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const data = await query('SELECT * FROM bills WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
    res.json({ ok: true, data });
  },

  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const { orderId, customerId, items, subtotal, gstAmount, discount = 0, 
            paidAmount, paymentMethod } = req.body;

    const countRes = await query('SELECT COUNT(*) as cnt FROM bills WHERE shop_id = ?', [shopId]);
    const billNumber = genBillNumber((countRes as any)[0].cnt);

    const id = genId();
    const totalAmount = subtotal + gstAmount - discount;
    const balanceAmount = totalAmount - paidAmount;

    await execute(
      `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal, 
        gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shopId, billNumber, orderId, customerId, subtotal, gstAmount, discount,
       totalAmount, paidAmount, balanceAmount, paymentMethod, balanceAmount > 0 ? 'partial' : 'paid']
    );

    res.status(201).json({ ok: true, billNumber, id });
  }
};