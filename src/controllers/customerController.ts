// import { Response } from 'express';
// import { genId } from '../utils/generateId';
// import pool from '../config/db';
// import { AuthRequest } from '../middleware/auth';

// export const customerController = {

//   getAll: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     try {
//       const [data] = await pool.execute(
//         'SELECT * FROM customers WHERE shop_id = ? ORDER BY created_at DESC',
//         [shopId]
//       );
//       res.json({ ok: true, data });
//     } catch (error: any) {
//       console.error('Failed to fetch customers:', error);
//       res.status(500).json({ ok: false, error: 'Failed to fetch customers' });
//     }
//   },

//   getById: async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     try {
//       const [customers] = await pool.execute(
//         'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
//         [id, shopId]
//       );

//       if ((customers as any[]).length === 0) {
//         return res.status(404).json({ ok: false, error: 'Customer not found' });
//       }

//       res.json({ ok: true, data: (customers as any[])[0] });
//     } catch (error: any) {
//       console.error('Failed to fetch customer:', error);
//       res.status(500).json({ ok: false, error: 'Failed to fetch customer' });
//     }
//   },

//   create: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     const { name, phone, email, address, gstin, dailyGramLimit = 0 } = req.body;

//     // ==================== VALIDATIONS ====================

//     // 1. Name
//     if (!name?.trim()) {
//       return res.status(400).json({ ok: false, error: 'Customer name is required' });
//     }
//     const safeName = name.trim();
//     if (safeName.length < 2 || safeName.length > 100) {
//       return res.status(400).json({ ok: false, error: 'Customer name must be between 2 and 100 characters' });
//     }

//     // 2. Phone (required)
//     if (!phone?.trim()) {
//       return res.status(400).json({ ok: false, error: 'Phone number is required' });
//     }
//     const safePhone = phone.toString().trim();
//     const phoneRegex = /^\d{10}$/;
//     if (!phoneRegex.test(safePhone)) {
//       return res.status(400).json({ ok: false, error: 'Phone number must be exactly 10 digits (e.g., 9876543210)' });
//     }

//     // 3. Email (optional)
//     let safeEmail: string | null = null;
//     if (email) {
//       const emailStr = email.trim().toLowerCase();
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(emailStr)) {
//         return res.status(400).json({ ok: false, error: 'Please provide a valid email address' });
//       }
//       safeEmail = emailStr;
//     }

//     // 4. GSTIN (optional)
//     let safeGstin: string | null = null;
//     if (gstin) {
//       const gstinStr = gstin.toString().trim().toUpperCase();
//       const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
//       if (!gstinRegex.test(gstinStr)) {
//         return res.status(400).json({ ok: false, error: 'Invalid GSTIN format. Example: 22AAAAA0000A1Z5' });
//       }
//       safeGstin = gstinStr;
//     }

//     // 5. Address (optional)
//     const safeAddress = address ? address.toString().trim() : null;
//     if (safeAddress && safeAddress.length > 500) {
//       return res.status(400).json({ ok: false, error: 'Address cannot exceed 500 characters' });
//     }

//     // 6. Daily Gram Limit
//     const safeDailyGramLimit = typeof dailyGramLimit === 'number' && dailyGramLimit >= 0
//       ? dailyGramLimit
//       : 0;

//     // ==================== BUSINESS LOGIC ====================
//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       const id = genId();

//       const [existing] = await connection.execute(
//         'SELECT id FROM customers WHERE shop_id = ? AND phone = ?',
//         [shopId, safePhone]
//       );

//       if ((existing as any[]).length > 0) {
//         await connection.rollback();
//         return res.status(409).json({ ok: false, error: 'Customer with this phone already exists' });
//       }

//       await connection.execute(
//         `INSERT INTO customers (id, shop_id, name, phone, email, address, gstin, daily_gram_limit)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [id, shopId, safeName, safePhone, safeEmail, safeAddress, safeGstin, safeDailyGramLimit]
//       );

//       await connection.commit();

//       res.status(201).json({
//         ok: true,
//         data: { id, name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, gstin: safeGstin, dailyGramLimit: safeDailyGramLimit }
//       });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Customer creation failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to create customer' });
//     } finally {
//       connection.release();
//     }
//   },

//   update: async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const shopId = req.shopId;
//     console.log('Updating customer with ID:', id, 'for shop ID:', shopId);
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     const { name, phone, email, address, gstin, dailyGramLimit } = req.body;

//     // FIX: check that at least one field was actually provided
//     if (
//       name === undefined && phone === undefined && email === undefined &&
//       address === undefined && gstin === undefined && dailyGramLimit === undefined
//     ) {
//       return res.status(400).json({ ok: false, error: 'No valid fields to update' });
//     }

//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       // FIX: build a dynamic SET clause — only update fields that were actually sent.
//       // The old code always set ALL 6 columns, overwriting unsent fields with null.
//       const updates: string[] = [];
//       const values: any[] = [];

//       if (name !== undefined) {
//         updates.push('name = ?');
//         values.push(name.trim());
//       }
//       if (phone !== undefined) {
//         const safePhone = phone.toString().trim();
//         // Optional duplicate phone check
//         const [existing] = await connection.execute(
//           'SELECT id FROM customers WHERE shop_id = ? AND phone = ? AND id != ?',
//           [shopId, safePhone, id]
//         );
//         if ((existing as any[]).length > 0) {
//           await connection.rollback();
//           return res.status(409).json({ ok: false, error: 'Phone number already used by another customer' });
//         }
//         updates.push('phone = ?');
//         values.push(safePhone);
//       }
//       if (email !== undefined) {
//         updates.push('email = ?');
//         values.push(email ? email.trim().toLowerCase() : null);
//       }
//       if (address !== undefined) {
//         updates.push('address = ?');
//         values.push(address ? address.toString().trim() : null);
//       }
//       if (gstin !== undefined) {
//         updates.push('gstin = ?');
//         values.push(gstin ? gstin.trim().toUpperCase() : null);
//       }
//       if (dailyGramLimit !== undefined) {
//         updates.push('daily_gram_limit = ?');
//         values.push(dailyGramLimit);
//       }

//       values.push(id, shopId);

//       const [result] = await connection.execute(
//         `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
//         values
//       ) as any[];

//       if (result.affectedRows === 0) {
//         await connection.rollback();
//         return res.status(404).json({ ok: false, error: 'Customer not found' });
//       }

//       await connection.commit();
//       res.json({ ok: true, message: 'Customer updated successfully' });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Customer update failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to update customer' });
//     } finally {
//       connection.release();
//     }
//   },

//   delete: async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     const connection = await pool.getConnection();

//     try {
//       await connection.beginTransaction();

//       const [customer] = await connection.execute(
//         'SELECT id, name FROM customers WHERE id = ? AND shop_id = ?',
//         [id, shopId]
//       ) as any[];

//       if (customer.length === 0) {
//         await connection.rollback();
//         return res.status(404).json({ ok: false, error: 'Customer not found' });
//       }

//       const customerName = customer[0].name;

//       const [ordersCount] = await connection.execute(
//         'SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND shop_id = ?',
//         [id, shopId]
//       ) as any[];

//       const [billsCount] = await connection.execute(
//         'SELECT COUNT(*) as count FROM bills WHERE customer_id = ? AND shop_id = ?',
//         [id, shopId]
//       ) as any[];

//       const orderCount = ordersCount[0].count;
//       const billCount = billsCount[0].count;

//       if (orderCount > 0 || billCount > 0) {
//         await connection.rollback();
//         return res.status(409).json({
//           ok: false,
//           error: `Cannot delete customer "${customerName}"`,
//           reason: 'Active records exist',
//           details: { orders: orderCount, bills: billCount },
//           message: `This customer has ${orderCount} order(s) and ${billCount} bill(s). Please delete the orders/bills first or archive this customer instead.`
//         });
//       }

//       await connection.execute(
//         'DELETE FROM customers WHERE id = ? AND shop_id = ?',
//         [id, shopId]
//       );

//       await connection.commit();
//       res.json({ ok: true, message: `Customer "${customerName}" deleted successfully` });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Customer deletion failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to delete customer' });
//     } finally {
//       connection.release();
//     }
//   }
// };


import { Response } from 'express';
import pool from '../config/db';
import { genId } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const customerController = {

  getAll: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [customers] = await pool.execute(
        'SELECT * FROM customers WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );
      res.json({ ok: true, data: customers });
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch customers' });
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [customers] = await pool.execute(
        'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      );

      if ((customers as any[]).length === 0) {
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      res.json({ ok: true, data: (customers as any[])[0] });
    } catch (error: any) {
      console.error('Failed to fetch customer:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch customer' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, phone, email, address, gstin } = req.body;

    if (!name?.trim() || !phone) {
      return res.status(400).json({ ok: false, error: 'Name and phone are required' });
    }

    const safeName = name.trim();
    const safePhone = phone.toString().trim();
    const safeEmail = email ? email.trim().toLowerCase() : null;
    const safeAddress = address ? address.trim() : null;
    const safeGstin = gstin ? gstin.toString().trim().toUpperCase() : null;

    // Phone validation
    if (!/^\d{10}$/.test(safePhone)) {
      return res.status(400).json({ ok: false, error: 'Phone number must be exactly 10 digits' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check for duplicate phone
      const [existing] = await connection.execute(
        'SELECT id FROM customers WHERE shop_id = ? AND phone = ?',
        [shopId, safePhone]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        return res.status(409).json({ ok: false, error: 'Customer with this phone number already exists' });
      }

      const id = genId();

      await connection.execute(
        `INSERT INTO customers (id, shop_id, name, phone, email, address, gstin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, shopId, safeName, safePhone, safeEmail, safeAddress, safeGstin]
      );

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'CREATE',
        entityType: 'customer',
        entityId: String(id),
        newValues: { name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, gstin: safeGstin },
        req
      });

      res.status(201).json({
        ok: true,
        message: 'Customer created successfully',
        data: { id, name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, gstin: safeGstin }
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer creation failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to create customer' });
    } finally {
      connection.release();
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { name, phone, email, address, gstin } = req.body;

    if (!name && !phone && !email && !address && !gstin) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }

    // Fetch old values for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
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
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone.toString().trim());
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email ? email.trim().toLowerCase() : null);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address ? address.trim() : null);
      }
      if (gstin !== undefined) {
        updates.push('gstin = ?');
        values.push(gstin ? gstin.toString().trim().toUpperCase() : null);
      }

      values.push(id, shopId);

      const [result] = await connection.execute(
        `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
        values
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'customer',
        entityId: String(id),
        oldValues,
        newValues: req.body,
        req
      });

      res.json({ ok: true, message: 'Customer updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update customer' });
    } finally {
      connection.release();
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    // Fetch old data before delete
    const [oldRows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
      [id, shopId]
    ) as any[];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM customers WHERE id = ? AND shop_id = ?',
        [id, shopId]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'DELETE',
        entityType: 'customer',
        entityId: String(id),
        oldValues: oldRows[0] || null,
        req
      });

      res.json({ ok: true, message: 'Customer deleted successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Customer deletion failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete customer' });
    } finally {
      connection.release();
    }
  }
};