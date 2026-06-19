// src/validations/productValidation.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  purity: z.string().min(2).max(20),
  currentRate: z.number().positive("Rate must be positive"),
  gstPercentage: z.number().min(0).max(100).default(3),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  purity: z.string().min(2).max(20).optional(),
  currentRate: z.number().positive().optional(),
  gstPercentage: z.number().min(0).max(100).optional(),
});