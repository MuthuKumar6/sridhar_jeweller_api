// src/validations/restrictionValidation.ts
import { z } from 'zod';

export const createRestrictionSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  dailyGramLimit: z.number().int().positive("Daily gram limit must be positive"),
  isActive: z.boolean().default(true),
});

export const updateRestrictionSchema = z.object({
  dailyGramLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const checkLimitSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  grams: z.number().positive(),
});