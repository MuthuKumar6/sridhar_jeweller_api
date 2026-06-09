// import { Request, Response } from 'express';
// import { genId } from '../utils/generateId';
// import pool from '../config/db';
// import { AuthRequest } from '../middleware/auth';

// export const restrictionController = {
//   getAll: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;

//     try {
//       const [data] = await pool.execute(
//         'SELECT * FROM restrictions WHERE shop_id = ? ORDER BY created_at DESC',
//         [shopId]
//       );

//       res.json({ ok: true, data });
//     } catch (error: any) {
//       console.error('Failed to fetch restrictions:', error);
//       res.status(500).json({ ok: false, error: 'Failed to fetch restrictions' });
//     }
//   },

//   create: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;
//     const { customerId, productId, dailyGramLimit, isActive = true } = req.body;

//     if (!customerId || !productId || dailyGramLimit === undefined) {
//       return res.status(400).json({ 
//         ok: false, 
//         error: 'customerId, productId and dailyGramLimit are required' 
//       });
//     }

//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       const id = genId();

//       // Prevent duplicate restriction for same customer + product
//       const [existing] = await connection.execute(
//         'SELECT id FROM restrictions WHERE shop_id = ? AND customer_id = ? AND product_id = ?',
//         [shopId, customerId, productId]
//       );

//       if ((existing as any[]).length > 0) {
//         await connection.rollback();
//         return res.status(409).json({ 
//           ok: false, 
//           error: 'Restriction already exists for this customer and product' 
//         });
//       }

//       await connection.execute(
//         `INSERT INTO restrictions (id, shop_id, customer_id, product_id, daily_gram_limit, is_active)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [id, shopId, customerId, productId, dailyGramLimit, isActive]
//       );

//       await connection.commit();

//       res.status(201).json({ ok: true, id });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Restriction creation failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to create restriction' });
//     } finally {
//       connection.release();
//     }
//   },

//   checkLimit: async (req: AuthRequest, res: Response) => {
//     try {
//       const { customerId, productId, grams } = req.query;
//       const shopId = req.shopId;

//       if (!customerId || !productId || !grams) {
//         return res.status(400).json({ 
//           ok: false, 
//           error: 'Missing required parameters: customerId, productId, grams' 
//         });
//       }

//       const [restrictions] = await pool.execute(
//         `SELECT * FROM restrictions 
//          WHERE shop_id = ? AND customer_id = ? AND product_id = ? AND is_active = TRUE`,
//         [shopId, customerId, productId]
//       ) as any[];

//       if (restrictions.length === 0) {
//         return res.json({ ok: true, allowed: true, limit: 0, usedToday: 0 });
//       }

//       const restriction = restrictions[0];
//       const today = new Date().toISOString().slice(0, 10);

//       const [usedRows] = await pool.execute(
//         `SELECT COALESCE(SUM(oi.weight_grams), 0) as used
//          FROM orders o 
//          JOIN order_items oi ON o.id = oi.order_id
//          JOIN product_types pt ON oi.product_type_id = pt.id
//          WHERE o.shop_id = ? 
//            AND o.customer_id = ? 
//            AND pt.product_id = ?
//            AND o.status NOT IN ('cancelled', 'returned')
//            AND DATE(o.created_at) = ?`,
//         [shopId, customerId, productId, today]
//       ) as any[];

//       const usedToday = Number(usedRows[0]?.used || 0);
//       const requested = Number(grams);
//       const allowed = (usedToday + requested) <= restriction.daily_gram_limit;

//       res.json({ 
//         ok: true, 
//         allowed, 
//         limit: restriction.daily_gram_limit, 
//         usedToday 
//       });
//     } catch (error: any) {
//       console.error('Limit check failed:', error);
//       res.status(500).json({ ok: false, error: 'Limit check failed' });
//     }
//   },

//   update: async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const shopId = req.shopId;
//     const { isActive, dailyGramLimit } = req.body;

//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       const [result] = await connection.execute(
//         `UPDATE restrictions 
//          SET is_active = ?, daily_gram_limit = ?
//          WHERE id = ? AND shop_id = ?`,
//         [isActive, dailyGramLimit, id, shopId]
//       ) as any[];

//       if (result.affectedRows === 0) {
//         await connection.rollback();
//         return res.status(404).json({ ok: false, error: 'Restriction not found' });
//       }

//       await connection.commit();
//       res.json({ ok: true, message: 'Restriction updated successfully' });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Restriction update failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to update restriction' });
//     } finally {
//       connection.release();
//     }
//   },

//   delete: async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const shopId = req.shopId;

//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       const [result] = await connection.execute(
//         'DELETE FROM restrictions WHERE id = ? AND shop_id = ?',
//         [id, shopId]
//       ) as any[];

//       if (result.affectedRows === 0) {
//         await connection.rollback();
//         return res.status(404).json({ ok: false, error: 'Restriction not found' });
//       }

//       await connection.commit();
//       res.json({ ok: true, message: 'Restriction deleted successfully' });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Restriction deletion failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to delete restriction' });
//     } finally {
//       connection.release();
//     }
//   }
// };


import { Response } from 'express';
import { genId } from '../utils/generateId';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const restrictionController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [data] = await pool.execute(
        'SELECT * FROM restrictions WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );
      res.json({ ok: true, data });
    } catch (error: any) {
      console.error('Failed to fetch restrictions:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch restrictions' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { customerId, productId, dailyGramLimit, isActive = true } = req.body;

    if (!customerId || !productId || dailyGramLimit === undefined) {
      return res.status(400).json({
        ok: false,
        error: 'customerId, productId and dailyGramLimit are required'
      });
    }

    if (typeof dailyGramLimit !== 'number' || dailyGramLimit < 0) {
      return res.status(400).json({ ok: false, error: 'dailyGramLimit must be a non-negative number' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const id = genId();

      const [existing] = await connection.execute(
        'SELECT id FROM restrictions WHERE shop_id = ? AND customer_id = ? AND product_id = ?',
        [shopId, customerId, productId]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          error: 'Restriction already exists for this customer and product'
        });
      }

      await connection.execute(
        `INSERT INTO restrictions (id, shop_id, customer_id, product_id, daily_gram_limit, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, shopId, customerId, productId, dailyGramLimit, isActive]
      );

      await connection.commit();
      res.status(201).json({ ok: true, id });
    } catch (error: any) {
      await connection.rollback();
      console.error('Restriction creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create restriction' });
    } finally {
      connection.release();
    }
  },

  checkLimit: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const { customerId, productId, grams } = req.query;

      if (!customerId || !productId || !grams) {
        return res.status(400).json({
          ok: false,
          error: 'Missing required parameters: customerId, productId, grams'
        });
      }

      const [restrictions] = await pool.execute(
        `SELECT * FROM restrictions
         WHERE shop_id = ? AND customer_id = ? AND product_id = ? AND is_active = TRUE`,
        [shopId, customerId, productId]
      ) as any[];

      if (restrictions.length === 0) {
        return res.json({ ok: true, allowed: true, limit: 0, usedToday: 0 });
      }

      const restriction = restrictions[0];
      const today = new Date().toISOString().slice(0, 10);

      const [usedRows] = await pool.execute(
        `SELECT COALESCE(SUM(oi.weight_grams), 0) as used
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN product_types pt ON oi.product_type_id = pt.id
         WHERE o.shop_id = ?
           AND o.customer_id = ?
           AND pt.product_id = ?
           AND o.status NOT IN ('cancelled', 'returned')
           AND DATE(o.created_at) = ?`,
        [shopId, customerId, productId, today]
      ) as any[];

      const usedToday = Number(usedRows[0]?.used || 0);
      const requested = Number(grams);
      const allowed = (usedToday + requested) <= restriction.daily_gram_limit;

      res.json({ ok: true, allowed, limit: restriction.daily_gram_limit, usedToday });
    } catch (error: any) {
      console.error('Limit check failed:', error);
      res.status(500).json({ ok: false, error: 'Limit check failed' });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { isActive, dailyGramLimit } = req.body;

    // FIX: validate that at least one field is being updated, and types are correct
    if (isActive === undefined && dailyGramLimit === undefined) {
      return res.status(400).json({ ok: false, error: 'No fields to update. Provide isActive or dailyGramLimit.' });
    }
    if (dailyGramLimit !== undefined && (typeof dailyGramLimit !== 'number' || dailyGramLimit < 0)) {
      return res.status(400).json({ ok: false, error: 'dailyGramLimit must be a non-negative number' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // FIX: build a dynamic SET clause — only update fields that were actually provided
      const updates: string[] = [];
      const values: any[] = [];

      if (isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(isActive);
      }
      if (dailyGramLimit !== undefined) {
        updates.push('daily_gram_limit = ?');
        values.push(dailyGramLimit);
      }

      values.push(id, shopId);

      const [result] = await connection.execute(
        `UPDATE restrictions SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
        values
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Restriction not found' });
      }

      await connection.commit();
      res.json({ ok: true, message: 'Restriction updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Restriction update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update restriction' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM restrictions WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Restriction not found' });
      }

      await connection.commit();
      res.json({ ok: true, message: 'Restriction deleted successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Restriction deletion failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete restriction' });
    } finally {
      connection.release();
    }
  }
};