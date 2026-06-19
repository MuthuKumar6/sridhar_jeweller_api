// src/validations/authValidation.ts
import { z } from 'zod';

export const signupSchema = z.object({
  shopName: z.string().min(3, "Shop name must be at least 3 characters").max(100),
  ownerName: z.string().max(100).optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});