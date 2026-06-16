import { Request, Response } from 'express';
import { query, execute } from '../utils/db';
import { AuthRequest } from '../middleware/auth';

export const shopController = {
  // GET /api/shop/profile — returns current shop info
  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      const shopId = req.shopId;
      const [shop] = await query(
        `SELECT id, shop_name, owner_name, email, phone,
                gstin, address, city, state, pincode
         FROM shops WHERE id = ?`,
        [shopId]
      ) as any[];

      if (!shop) return res.status(404).json({ ok: false, error: 'Shop not found' });
      res.json({ ok: true, data: shop });
    } catch (err: any) {
      console.error('[shop.getProfile]', err.message);
      res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
    }
  },

  // PUT /api/shop/profile — update shop info
  updateProfile: async (req: AuthRequest, res: Response) => {
    try {
      const shopId = req.shopId;
      const { shopName, ownerName, phone, gstin, address, city, state, pincode } = req.body;

      if (!shopName?.trim()) {
        return res.status(400).json({ ok: false, error: 'Shop name is required' });
      }

      await execute(
        `UPDATE shops SET
           shop_name = ?, owner_name = ?, phone = ?,
           gstin = ?, address = ?, city = ?, state = ?, pincode = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [shopName.trim(), ownerName || '', phone || '',
         gstin || '', address || '', city || '', state || '', pincode || '',
         shopId]
      );

      res.json({ ok: true, message: 'Profile updated successfully' });
    } catch (err: any) {
      console.error('[shop.updateProfile]', err.message);
      res.status(500).json({ ok: false, error: 'Failed to update profile' });
    }
  },
};


// import { Response } from 'express';
// import pool from '../config/db';
// import { genId } from '../utils/generateId';
// import { AuthRequest } from '../middleware/auth';

// export const shopController = {

//   getProfile: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     try {
//       const [shops] = await pool.execute(
//         'SELECT id, shop_name, owner_name, phone, email, address, gstin, created_at FROM shops WHERE id = ?',
//         [shopId]
//       );

//       if ((shops as any[]).length === 0) {
//         return res.status(404).json({ ok: false, error: 'Shop not found' });
//       }

//       res.json({ ok: true, data: (shops as any[])[0] });
//     } catch (error: any) {
//       console.error('Failed to fetch shop profile:', error);
//       res.status(500).json({ ok: false, error: 'Failed to fetch shop profile' });
//     }
//   },

//   updateProfile: async (req: AuthRequest, res: Response) => {
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     const { name, owner_name, phone, email, address, gstin } = req.body;

//     if (!name?.trim() && !owner_name?.trim() && !phone?.trim()) {
//       return res.status(400).json({ ok: false, error: 'No valid fields to update' });
//     }

//     const connection = await pool.getConnection();
//     try {
//       await connection.beginTransaction();

//       const updates: string[] = [];
//       const values: any[] = [];

//       if (name !== undefined) {
//         updates.push('name = ?');
//         values.push(name.trim());
//       }
//       if (owner_name !== undefined) {
//         updates.push('owner_name = ?');
//         values.push(owner_name.trim());
//       }
//       if (phone !== undefined) {
//         updates.push('phone = ?');
//         values.push(phone.toString().trim());
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
//         values.push(gstin ? gstin.toString().trim().toUpperCase() : null);
//       }

//       values.push(shopId);

//       const updateres = await connection.execute(
//         `UPDATE shops SET ${updates.join(', ')} WHERE id = ?`,
//         values
//       );

//       await connection.commit();
//       console.log('Shop profile updated:', { shopId, updates: updateres});
//       res.json({ ok: true, message: 'Shop profile updated successfully' });
//     } catch (error: any) {
//       await connection.rollback();
//       console.error('Shop update failed:', error);
//       res.status(500).json({ ok: false, error: 'Failed to update shop profile' });
//     } finally {
//       connection.release();
//     }
//   },

//   // Optional: List all shops (only for super-admin if you implement roles later)
//   getAll: async (req: AuthRequest, res: Response) => {
//     // For now, return only current shop (multi-tenant safety)
//     const shopId = req.shopId;
//     if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

//     try {
//       const [shop] = await pool.execute(
//         'SELECT id, shop_name, owner_name, phone, email, address, gstin FROM shops WHERE id = ?',
//         [shopId]
//       );
//       res.json({ ok: true, data: shop });
//     } catch (error: any) {
//       console.error('Failed to fetch shops:', error);
//       res.status(500).json({ ok: false, error: 'Failed to fetch shops' });
//     }
//   }
// };