import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId } from '../utils/generateId';

export const alertController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const data = await query('SELECT * FROM stock_alerts WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
    res.json({ ok: true, data });
  },

  getUnread: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const data = await query(
      'SELECT * FROM stock_alerts WHERE shop_id = ? AND is_read = FALSE ORDER BY created_at DESC', 
      [shopId]
    );
    res.json({ ok: true, data });
  },

  markRead: async (req: Request, res: Response) => {
    const { id } = req.params;
    const shopId = (req as any).shopId;
    await execute('UPDATE stock_alerts SET is_read = TRUE WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true });
  },

  markAllRead: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    await execute('UPDATE stock_alerts SET is_read = TRUE WHERE shop_id = ?', [shopId]);
    res.json({ ok: true });
  }
};