import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { genId } from '../utils/generateId';

export const signup = async (req: Request, res: Response) => {
  try {
    console.log('Signup request body:', req.body);
    const { shopName, ownerName, email, phone, password } = req.body;

    if (!shopName || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Shop name, email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const shopId = genId();

    const [existing] = await pool.execute(
      'SELECT id FROM shops WHERE email = ?', [email.toLowerCase()]
    );

    if ((existing as any[]).length > 0) {
      return res.status(400).json({ ok: false, error: 'Email already exists' });
    }

    await pool.execute(
      `INSERT INTO shops (id, shop_name, owner_name, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shopId, shopName.trim(), ownerName.trim(), email.toLowerCase(), phone, hashedPassword]
    );

    const token = jwt.sign({ shopId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      ok: true,
      shop: { id: shopId, shopName, ownerName, email: email.toLowerCase(), phone },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      'SELECT * FROM shops WHERE email = ?', [email.toLowerCase()]
    );

    const shop = (rows as any[])[0];
    if (!shop) return res.status(400).json({ ok: false, error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, shop.password_hash);
    if (!isMatch) return res.status(400).json({ ok: false, error: 'Invalid credentials' });

    const token = jwt.sign({ shopId: shop.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      ok: true,
      shop: {
        id: shop.id,
        shopName: shop.shop_name,
        ownerName: shop.owner_name,
        email: shop.email,
        phone: shop.phone
      },
      token
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};