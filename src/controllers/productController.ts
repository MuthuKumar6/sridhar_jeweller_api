
// import { Request, Response } from 'express';
// import { genId } from '../utils/generateId';
// import pool from '../config/db';
// import { AuthRequest } from '../middleware/auth';

// export const productController = {
//     getAll: async (req: AuthRequest, res: Response) => {
//         const shopId = req.shopId;

//         try {
//             const [products] = await pool.execute(
//                 'SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC',
//                 [shopId]
//             );

//             res.json({ ok: true, data: products });
//         } catch (error: any) {
//             console.error('Failed to fetch products:', error);
//             res.status(500).json({ ok: false, error: 'Failed to fetch products' });
//         }
//     },

//     getById: async (req: AuthRequest, res: Response) => {
//         const { id } = req.params;
//         const shopId = req.shopId;

//         try {
//             const [products] = await pool.execute(
//                 'SELECT * FROM products WHERE id = ? AND shop_id = ?',
//                 [id, shopId]
//             );

//             if ((products as any[]).length === 0) {
//                 return res.status(404).json({ ok: false, error: 'Product not found' });
//             }

//             res.json({ ok: true, data: (products as any[])[0] });
//         } catch (error: any) {
//             console.error('Failed to fetch product:', error);
//             res.status(500).json({ ok: false, error: 'Failed to fetch product' });
//         }
//     },

//     create: async (req: AuthRequest, res: Response) => {
//         const shopId = req.shopId;
//         const { name, purity, currentRate, gstPercentage = 3 } = req.body;

//         if (!name?.trim() || !purity || currentRate === undefined) {
//             return res.status(400).json({
//                 ok: false,
//                 error: 'Name, purity and current rate are required'
//             });
//         }

//         const connection = await pool.getConnection();

//         try {
//             await connection.beginTransaction();

//             const id = genId();

//             const safeName = name.trim();
//             const safePurity = purity.trim();

//             // Optional: Check for duplicate product name
//             const [existing] = await connection.execute(
//                 'SELECT id FROM products WHERE shop_id = ? AND name = ?',
//                 [shopId, safeName]
//             );

//             if ((existing as any[]).length > 0) {
//                 await connection.rollback();
//                 return res.status(409).json({ ok: false, error: 'Product with this name already exists' });
//             }

//             await connection.execute(
//                 `INSERT INTO products (id, shop_id, name, purity, current_rate, gst_percentage)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//                 [id, shopId, safeName, safePurity, currentRate, gstPercentage]
//             );

//             await connection.commit();

//             res.status(201).json({
//                 ok: true,
//                 data: { id, name: safeName, purity: safePurity, currentRate, gstPercentage }
//             });
//         } catch (error: any) {
//             await connection.rollback();
//             console.error('Product creation failed:', error);
//             res.status(500).json({ ok: false, error: 'Failed to create product' });
//         } finally {
//             connection.release();
//         }
//     },

//     update: async (req: AuthRequest, res: Response) => {
//         const { id } = req.params;
//         const shopId = req.shopId;
//         const { name, purity, currentRate, gstPercentage } = req.body;

//         if (!name?.trim() && !purity && currentRate === undefined) {
//             return res.status(400).json({ ok: false, error: 'No valid fields to update' });
//         }

//         const connection = await pool.getConnection();

//         try {
//             await connection.beginTransaction();

//             const safeName = name ? name.trim() : undefined;
//             const safePurity = purity ? purity.trim() : undefined;

//             // Duplicate name check (if name is being updated)
//             if (safeName) {
//                 const [existing] = await connection.execute(
//                     'SELECT id FROM products WHERE shop_id = ? AND name = ? AND id != ?',
//                     [shopId, safeName, id]
//                 );

//                 if ((existing as any[]).length > 0) {
//                     await connection.rollback();
//                     return res.status(409).json({ ok: false, error: 'Product name already exists' });
//                 }
//             }

//             await connection.execute(
//                 `UPDATE products 
//          SET name = ?, purity = ?, current_rate = ?, gst_percentage = ?
//          WHERE id = ? AND shop_id = ?`,
//                 [
//                     safeName || null,
//                     safePurity || null,
//                     currentRate,
//                     gstPercentage,
//                     id,
//                     shopId
//                 ]
//             );

//             await connection.commit();
//             res.json({ ok: true, message: 'Product updated successfully' });
//         } catch (error: any) {
//             await connection.rollback();
//             console.error('Product update failed:', error);
//             res.status(500).json({ ok: false, error: 'Failed to update product' });
//         } finally {
//             connection.release();
//         }
//     },

//     delete: async (req: AuthRequest, res: Response) => {
//         const { id } = req.params;
//         const shopId = req.shopId;

//         const connection = await pool.getConnection();

//         try {
//             await connection.beginTransaction();

//             const [result] = await connection.execute(
//                 'DELETE FROM products WHERE id = ? AND shop_id = ?',
//                 [id, shopId]
//             ) as any[];

//             if (result.affectedRows === 0) {
//                 await connection.rollback();
//                 return res.status(404).json({ ok: false, error: 'Product not found' });
//             }

//             await connection.commit();
//             res.json({ ok: true, message: 'Product deleted successfully' });
//         } catch (error: any) {
//             await connection.rollback();
//             console.error('Product deletion failed:', error);
//             res.status(500).json({ ok: false, error: 'Failed to delete product' });
//         } finally {
//             connection.release();
//         }
//     }
// };


import { Response } from 'express';
import pool from '../config/db';
import { genId } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const productController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

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

  getById: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

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

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, purity, currentRate, gstPercentage = 3 } = req.body;

    if (!name?.trim() || !purity || currentRate === undefined) {
      return res.status(400).json({ ok: false, error: 'Name, purity and current rate are required' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const id = genId();
      const safeName = name.trim();
      const safePurity = purity.trim();

      // Duplicate name check
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

      // AUDIT LOG
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'CREATE',
        entityType: 'product',
        entityId: id,
        newValues: { name: safeName, purity: safePurity, currentRate, gstPercentage },
        req
      });

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

  // update: async (req: AuthRequest, res: Response) => {
  //   const { id } = req.params;
  //   const shopId = req.shopId;
  //   if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  //   const { name, purity, currentRate, gstPercentage } = req.body;

  //   if (!name && !purity && currentRate === undefined && gstPercentage === undefined) {
  //     return res.status(400).json({ ok: false, error: 'No valid fields to update' });
  //   }

  //   // Fetch old values for audit
  //   const [oldRows] = await pool.execute(
  //     'SELECT * FROM products WHERE id = ? AND shop_id = ?',
  //     [id, shopId]
  //   ) as any[];

  //   const oldValues = oldRows.length > 0 ? oldRows[0] : null;

  //   const connection = await pool.getConnection();
  //   try {
  //     await connection.beginTransaction();

  //     const updates: string[] = [];
  //     const values: any[] = [];

  //     if (name !== undefined) {
  //       updates.push('name = ?');
  //       values.push(name.trim());
  //     }
  //     if (purity !== undefined) {
  //       updates.push('purity = ?');
  //       values.push(purity.trim());
  //     }
  //     if (currentRate !== undefined) {
  //       updates.push('current_rate = ?');
  //       values.push(currentRate);
  //     }
  //     if (gstPercentage !== undefined) {
  //       updates.push('gst_percentage = ?');
  //       values.push(gstPercentage);
  //     }

  //     // Duplicate name check if name is updated
  //     if (name !== undefined) {
  //       const [existing] = await connection.execute(
  //         'SELECT id FROM products WHERE shop_id = ? AND name = ? AND id != ?',
  //         [shopId, name.trim(), id]
  //       );
  //       if ((existing as any[]).length > 0) {
  //         await connection.rollback();
  //         return res.status(409).json({ ok: false, error: 'Product name already exists' });
  //       }
  //     }

  //     values.push(id, shopId);

  //     await connection.execute(
  //       `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
  //       values
  //     );

  //     await connection.commit();
  //     // AUDIT LOG
  //     await logAudit({
  //       shopId,
  //       actorId: req.actor?.id,
  //       actorName: req.actor?.name,
  //       actorEmail: req.actor?.email,
  //       action: 'UPDATE',
  //       entityType: 'product',
  //       entityId: id,
  //       oldValues,
  //       newValues: req.body,
  //       req
  //     });

  //     res.json({ ok: true, message: 'Product updated successfully' });
  //   } catch (error: any) {
  //     await connection.rollback();
  //     console.error('Product update failed:', error);
  //     res.status(500).json({ ok: false, error: 'Failed to update product' });
  //   } finally {
  //     connection.release();
  //   }
  // },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, purity, currentRate, gstPercentage } = req.body;

    if (!name && !purity && currentRate === undefined && gstPercentage === undefined) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }

    // Fetch old values for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const oldValues = oldRows.length > 0 ? oldRows[0] : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
      }
      if (purity !== undefined) {
        updates.push('purity = ?');
        values.push(purity.trim());
      }
      if (currentRate !== undefined) {
        updates.push('current_rate = ?');
        values.push(currentRate);
      }
      if (gstPercentage !== undefined) {
        updates.push('gst_percentage = ?');
        values.push(gstPercentage);
      }

      if (name !== undefined) {
        const [existing] = await connection.execute(
          'SELECT id FROM products WHERE shop_id = ? AND name = ? AND id != ?',
          [shopId, name.trim(), id]
        );
        if ((existing as any[]).length > 0) {
          await connection.rollback();
          return res.status(409).json({ ok: false, error: 'Product name already exists' });
        }
      }

      values.push(id, shopId);

      const [result] = await connection.execute(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
        values
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Product not found' });
      }

      await connection.commit();

      // AUDIT LOG
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'product',
        entityId: String(id),
        oldValues,
        newValues: req.body,
        req
      });

      res.json({ ok: true, message: 'Product updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Product update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update product' });
    } finally {
      connection.release();
    }
  },


  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const [oldRows] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

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

      // AUDIT LOG
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'DELETE',
        entityType: 'product',
        entityId: String(id),
        oldValues: oldRows[0] || null,
        req
      });


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