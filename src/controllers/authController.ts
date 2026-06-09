import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { genId } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';

export const signup = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Signup request body:', req.body);

    const { shopName, ownerName, email, phone, password } = req.body;

    // ==================== VALIDATIONS ====================

    // 1. Shop Name
    if (!shopName?.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Shop name is required'
      });
    }
    const safeShopName = shopName.trim();
    if (safeShopName.length < 3 || safeShopName.length > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Shop name must be between 3 and 100 characters'
      });
    }

    // 2. Owner Name (optional)
    const safeOwnerName = ownerName ? ownerName.trim() : '';
    if (safeOwnerName.length > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Owner name cannot exceed 100 characters'
      });
    }

    // 3. Email
    if (!email?.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Email is required'
      });
    }
    const safeEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail)) {
      return res.status(400).json({
        ok: false,
        error: 'Please provide a valid email address'
      });
    }

    // 4. Phone (optional but validated if provided)
    let safePhone: string | null = null;
    if (phone) {
      const phoneStr = phone.toString().trim();
      // Allow only digits, common for Indian numbers (10 digits)
      const phoneRegex = /^\d{10}$/; // Strict 10 digits (India)

      if (!phoneRegex.test(phoneStr)) {
        return res.status(400).json({
          ok: false,
          error: 'Phone number must be exactly 10 digits (e.g., 9876543210)'
        });
      }
      safePhone = phoneStr;
    }

    // 5. Password
    if (!password) {
      return res.status(400).json({
        ok: false,
        error: 'Password is required'
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    if (password.length > 128) {
      return res.status(400).json({
        ok: false,
        error: 'Password is too long'
      });
    }

    // ==================== BUSINESS LOGIC ====================

    const hashedPassword = await bcrypt.hash(password, 10);
    const shopId = genId();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check for existing email
      const [existing] = await connection.execute(
        'SELECT id FROM shops WHERE email = ?',
        [safeEmail]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          error: 'Email already exists'
        });
      }

      // Insert new shop
      await connection.execute(
        `INSERT INTO shops (id, shop_name, owner_name, email, phone, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [shopId, safeShopName, safeOwnerName, safeEmail, safePhone, hashedPassword]
      );

      await connection.commit();

      const token = jwt.sign({ shopId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

      res.status(201).json({
        ok: true,
        shop: {
          id: shopId,
          shopName: safeShopName,
          ownerName: safeOwnerName,
          email: safeEmail,
          phone: safePhone
        },
        token
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({
      ok: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
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