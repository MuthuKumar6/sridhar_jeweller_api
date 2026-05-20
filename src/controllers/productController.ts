import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { genId } from '../utils/generateId';

export const productController = {
    getAll: async (req: Request, res: Response) => {
        const shopId = (req as any).shopId;
        const products = await query('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
        res.json({ ok: true, data: products });
    },

    getById: async (req: Request, res: Response) => {
        const { id } = req.params;
        const shopId = (req as any).shopId;
        const [product] = await query('SELECT * FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);
        res.json({ ok: true, data: product });
    },

    create: async (req: Request, res: Response) => {
        const shopId = (req as any).shopId;
        const { name, purity, currentRate, gstPercentage = 3 } = req.body;
        const id = genId();

        await execute(
            `INSERT INTO products (id, shop_id, name, purity, current_rate, gst_percentage)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id, shopId, name, purity, currentRate, gstPercentage]
        );

        res.status(201).json({ ok: true, data: { id, ...req.body } });
    },

    update: async (req: Request, res: Response) => {
        const { id } = req.params;
        const shopId = (req as any).shopId;
        const { name, purity, currentRate, gstPercentage } = req.body;

        await execute(
            `UPDATE products SET name=?, purity=?, current_rate=?, gst_percentage=? 
       WHERE id=? AND shop_id=?`,
            [name, purity, currentRate, gstPercentage, id, shopId]
        );

        res.json({ ok: true, message: 'Updated successfully' });
    },

    delete: async (req: Request, res: Response) => {
        const { id } = req.params;
        const shopId = (req as any).shopId;
        await execute('DELETE FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);
        res.json({ ok: true, message: 'Deleted successfully' });
    }
};