// import { Request, Response } from 'express';
// import { query, execute } from '../utils/db';
// import { genId } from '../utils/generateId';

// export const productController = {
//     getAll: async (req: Request, res: Response) => {
//         const shopId = (req as any).shopId;
//         const products = await query('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
//         res.json({ ok: true, data: products });
//     },

//     getById: async (req: Request, res: Response) => {
//         const { id } = req.params;
//         const shopId = (req as any).shopId;
//         const [product] = await query('SELECT * FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);
//         res.json({ ok: true, data: product });
//     },

//     create: async (req: Request, res: Response) => {
//         const shopId = (req as any).shopId;
//         const { name, purity, currentRate, gstPercentage = 3 } = req.body;
//         const id = genId();

//         await execute(
//             `INSERT INTO products (id, shop_id, name, purity, current_rate, gst_percentage)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//             [id, shopId, name, purity, currentRate, gstPercentage]
//         );

//         res.status(201).json({ ok: true, data: { id, ...req.body } });
//     },

//     update: async (req: Request, res: Response) => {
//         const { id } = req.params;
//         const shopId = (req as any).shopId;
//         const { name, purity, currentRate, gstPercentage } = req.body;

//         await execute(
//             `UPDATE products SET name=?, purity=?, current_rate=?, gst_percentage=? 
//        WHERE id=? AND shop_id=?`,
//             [name, purity, currentRate, gstPercentage, id, shopId]
//         );

//         res.json({ ok: true, message: 'Updated successfully' });
//     },

//     delete: async (req: Request, res: Response) => {
//         const { id } = req.params;
//         const shopId = (req as any).shopId;
//         await execute('DELETE FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);
//         res.json({ ok: true, message: 'Deleted successfully' });
//     }
// };

import { Request, Response } from 'express';
import { genId } from '../utils/generateId';
import pool from '../config/db';

export const productController = {
    getAll: async (req: Request, res: Response) => {
        const shopId = (req as any).shopId;

        try {
            const [products] = await pool.execute(
                'SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC',
                [shopId]
            );

            res.json({ ok: true, data: products });
        } catch (error: any) {
            console.error('Failed to fetch products:', error);
            res.status(500).json({ ok: false, error: 'Failed to fetch products' });
        }
    },

    getById: async (req: Request, res: Response) => {
        const { id } = req.params;
        const shopId = (req as any).shopId;

        try {
            const [products] = await pool.execute(
                'SELECT * FROM products WHERE id = ? AND shop_id = ?',
                [id, shopId]
            );

            if ((products as any[]).length === 0) {
                return res.status(404).json({ ok: false, error: 'Product not found' });
            }

            res.json({ ok: true, data: (products as any[])[0] });
        } catch (error: any) {
            console.error('Failed to fetch product:', error);
            res.status(500).json({ ok: false, error: 'Failed to fetch product' });
        }
    },

    create: async (req: Request, res: Response) => {
        const shopId = (req as any).shopId;
        const { name, purity, currentRate, gstPercentage = 3 } = req.body;

        if (!name?.trim() || !purity || currentRate === undefined) {
            return res.status(400).json({
                ok: false,
                error: 'Name, purity and current rate are required'
            });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const id = genId();

            const safeName = name.trim();
            const safePurity = purity.trim();

            // Optional: Check for duplicate product name
            const [existing] = await connection.execute(
                'SELECT id FROM products WHERE shop_id = ? AND name = ?',
                [shopId, safeName]
            );

            if ((existing as any[]).length > 0) {
                await connection.rollback();
                return res.status(409).json({ ok: false, error: 'Product with this name already exists' });
            }

            await connection.execute(
                `INSERT INTO products (id, shop_id, name, purity, current_rate, gst_percentage)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [id, shopId, safeName, safePurity, currentRate, gstPercentage]
            );

            await connection.commit();

            res.status(201).json({
                ok: true,
                data: { id, name: safeName, purity: safePurity, currentRate, gstPercentage }
            });
        } catch (error: any) {
            await connection.rollback();
            console.error('Product creation failed:', error);
            res.status(500).json({ ok: false, error: 'Failed to create product' });
        } finally {
            connection.release();
        }
    },

    update: async (req: Request, res: Response) => {
        const { id } = req.params;
        const shopId = (req as any).shopId;
        const { name, purity, currentRate, gstPercentage } = req.body;

        if (!name?.trim() && !purity && currentRate === undefined) {
            return res.status(400).json({ ok: false, error: 'No valid fields to update' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const safeName = name ? name.trim() : undefined;
            const safePurity = purity ? purity.trim() : undefined;

            // Duplicate name check (if name is being updated)
            if (safeName) {
                const [existing] = await connection.execute(
                    'SELECT id FROM products WHERE shop_id = ? AND name = ? AND id != ?',
                    [shopId, safeName, id]
                );

                if ((existing as any[]).length > 0) {
                    await connection.rollback();
                    return res.status(409).json({ ok: false, error: 'Product name already exists' });
                }
            }

            await connection.execute(
                `UPDATE products 
         SET name = ?, purity = ?, current_rate = ?, gst_percentage = ?
         WHERE id = ? AND shop_id = ?`,
                [
                    safeName || null,
                    safePurity || null,
                    currentRate,
                    gstPercentage,
                    id,
                    shopId
                ]
            );

            await connection.commit();
            res.json({ ok: true, message: 'Product updated successfully' });
        } catch (error: any) {
            await connection.rollback();
            console.error('Product update failed:', error);
            res.status(500).json({ ok: false, error: 'Failed to update product' });
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

            const [result] = await connection.execute(
                'DELETE FROM products WHERE id = ? AND shop_id = ?',
                [id, shopId]
            ) as any[];

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ ok: false, error: 'Product not found' });
            }

            await connection.commit();
            res.json({ ok: true, message: 'Product deleted successfully' });
        } catch (error: any) {
            await connection.rollback();
            console.error('Product deletion failed:', error);
            res.status(500).json({ ok: false, error: 'Failed to delete product' });
        } finally {
            connection.release();
        }
    }
};