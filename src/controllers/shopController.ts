import { Request, Response } from 'express';
import { query, execute } from '../utils/db';

export const shopController = {
  // GET /api/shop/profile — returns current shop info
  getProfile: async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).shopId;
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
  updateProfile: async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).shopId;
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