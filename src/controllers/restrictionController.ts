import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId } from '../utils/generateId';

export const restrictionController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const data = await query('SELECT * FROM restrictions WHERE shop_id = ?', [shopId]);
    res.json({ ok: true, data });
  },

  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const id = genId();
    const { customerId, productId, dailyGramLimit, isActive = true } = req.body;

    await execute(
      `INSERT INTO restrictions (id, shop_id, customer_id, product_id, daily_gram_limit, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, shopId, customerId, productId, dailyGramLimit, isActive]
    );

    res.status(201).json({ ok: true, id });
  },

  checkLimit: async (req: Request, res: Response) => {
    // You can implement business logic here if needed
    res.json({ ok: true, message: "Limit check endpoint ready" });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    await execute('DELETE FROM restrictions WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true, message: 'Restriction deleted' });
  },

  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    console.log('Update restriction request body:', req.body);
    const { isActive } = req.body;
    await execute(
      `UPDATE restrictions SET is_active = ?
       WHERE id = ? AND shop_id = ?`,
      [isActive, id, shopId]
    );
    
    res.json({ ok: true, message: 'Restriction updated' });
  }
};