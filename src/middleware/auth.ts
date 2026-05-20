import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ ok: false, error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { shopId: string };
    (req as any).shopId = decoded.shopId;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};