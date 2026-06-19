// src/validations/customerValidation.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  gstin: z.string().length(15, "GSTIN must be 15 characters").optional().or(z.literal("")),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  gstin: z.string().length(15).optional().or(z.literal("")),
});