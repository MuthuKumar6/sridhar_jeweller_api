// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      // Optional: Attach validated data to request
      (req as any).validated = validatedData;
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }

      console.error('Validation middleware error:', error);
      res.status(500).json({ ok: false, error: 'Internal validation error' });
    }
  };
};