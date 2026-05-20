import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId } from '../utils/generateId';

export const customerController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const data = await query(
      'SELECT * FROM customers WHERE shop_id = ? ORDER BY created_at DESC', 
      [shopId]
    );
    res.json({ ok: true, data });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    const [customer] = await query(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?', 
      [id, shopId]
    );
    res.json({ ok: true, data: customer });
  },

  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const id = genId();
    const { name, phone, email, address, gstin, dailyGramLimit = 0 } = req.body;

    await execute(
      `INSERT INTO customers (id, shop_id, name, phone, email, address, gstin, daily_gram_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shopId, name, phone, email, address, gstin, dailyGramLimit]
    );

    res.status(201).json({ ok: true, data: { id, ...req.body } });
  },

  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    const { name, phone, email, address, gstin, dailyGramLimit } = req.body;

    await execute(
      `UPDATE customers SET name=?, phone=?, email=?, address=?, gstin=?, daily_gram_limit=?
       WHERE id=? AND shop_id=?`,
      [name, phone, email, address, gstin, dailyGramLimit, id, shopId]
    );

    res.json({ ok: true, message: 'Customer updated' });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    await execute('DELETE FROM customers WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true, message: 'Customer deleted' });
  }
};