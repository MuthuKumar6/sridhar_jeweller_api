// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';

// export const protect = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ ok: false, error: 'No token' });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { shopId: string };
//     (req as any).shopId = decoded.shopId;
//     next();
//   } catch (err) {
//     res.status(401).json({ ok: false, error: 'Invalid token' });
//   }
// };

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  shopId?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { shopId: string };
    
    if (!decoded.shopId) {
      return res.status(401).json({ ok: false, error: 'Invalid token payload' });
    }

    req.shopId = decoded.shopId;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'Token expired' });
    }
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};