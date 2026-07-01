import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const shopController = {

  getProfile: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    try {
      const [shops] = await pool.execute(
        `SELECT id, shop_name, owner_name, email, phone, 
                gstin, address, city, state, pincode, created_at 
         FROM shops WHERE id = ?`,
        [shopId]
      );

      if ((shops as any[]).length === 0) {
        return res.status(404).json({ ok: false, error: 'Shop not found' });
      }

      res.json({ ok: true, data: (shops as any[])[0] });
    } catch (error: any) {
      console.error('Failed to fetch shop profile:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch shop profile' });
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    const shopId = req.shopId;
    if (!shopId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { shopName, ownerName, phone, gstin, address, city, state, pincode } = req.body;

    if (!shopName?.trim()) {
      return res.status(400).json({ ok: false, error: 'Shop name is required' });
    }

    // Fetch old values for audit
    const [oldRows] = await pool.execute(
      'SELECT * FROM shops WHERE id = ?',
      [shopId]
    ) as any[];

    const oldValues = oldRows.length > 0 ? oldRows[0] : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const safeShopName = shopName.trim();
      const safeOwnerName = ownerName ? ownerName.trim() : null;
      const safePhone = phone ? phone.toString().trim() : null;
      const safeGstin = gstin ? gstin.toString().trim().toUpperCase() : null;
      const safeAddress = address ? address.trim() : null;
      const safeCity = city ? city.trim() : null;
      const safeState = state ? state.trim() : null;
      const safePincode = pincode ? pincode.toString().trim() : null;

      const [result] = await connection.execute(
        `UPDATE shops 
         SET shop_name = ?, owner_name = ?, phone = ?, gstin = ?, 
             address = ?, city = ?, state = ?, pincode = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          safeShopName, safeOwnerName, safePhone, safeGstin,
          safeAddress, safeCity, safeState, safePincode, shopId
        ]
      ) as any[];

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Shop not found' });
      }

      await connection.commit();

      // ==================== AUDIT LOG ====================
      await logAudit({
        shopId,
        actorId: req.actor?.id,
        actorName: req.actor?.name,
        actorEmail: req.actor?.email,
        action: 'UPDATE',
        entityType: 'shop',
        entityId: shopId,
        oldValues: {
          shop_name: oldValues?.shop_name,
          owner_name: oldValues?.owner_name,
          phone: oldValues?.phone,
          gstin: oldValues?.gstin,
          address: oldValues?.address,
          city: oldValues?.city,
          state: oldValues?.state,
          pincode: oldValues?.pincode
        },
        newValues: {
          shopName: safeShopName,
          ownerName: safeOwnerName,
          phone: safePhone,
          gstin: safeGstin,
          address: safeAddress,
          city: safeCity,
          state: safeState,
          pincode: safePincode
        },
        req
      });

      res.json({ ok: true, message: 'Shop profile updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Shop profile update failed:', error);
      res.status(500).json({ ok: false, error: 'Failed to update shop profile' });
    } finally {
      connection.release();
    }
  }
};