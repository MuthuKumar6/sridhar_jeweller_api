import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  shopId?: any;
  actor?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.shopId) {
      return res.status(401).json({ ok: false, error: 'Invalid token payload' });
    }

    req.shopId = decoded.shopId;
    req.actor = {
      id: decoded.shopId,
      name: decoded.shopName || decoded.ownerName,
      email: decoded.email,
    };
    
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'Token expired' });
    }
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};