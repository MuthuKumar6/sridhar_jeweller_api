// src/validations/shopValidation.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  shopName: z.string().min(3).max(100).optional(),
  ownerName: z.string().max(100).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});