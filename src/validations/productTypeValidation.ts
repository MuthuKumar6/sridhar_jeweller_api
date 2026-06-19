// src/validations/productTypeValidation.ts
import { z } from 'zod';

export const createProductTypeSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(2).max(255),
  netWeight: z.number().positive(),
//   grossWeight: z.number().positive().optional(),
  makingCharges: z.number().min(0).optional(),
  makingChargeType: z.enum(['per_gram', 'flat']).default('per_gram'),
  inStock: z.number().min(0).default(0),
  quantity: z.number().min(0).default(0),
});

export const updateStockSchema = z.object({
  change: z.number().int(),
});