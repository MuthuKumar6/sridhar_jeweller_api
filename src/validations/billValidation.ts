// src/validations/billValidation.ts
import { z } from 'zod';

export const createBillSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  orderId: z.string().optional(),
  subtotal: z.number().nonnegative("Subtotal cannot be negative"),
  gstAmount: z.number().nonnegative("GST amount cannot be negative").default(0),
  discount: z.number().nonnegative("Discount cannot be negative").default(0),
  paidAmount: z.number().nonnegative("Paid amount cannot be negative"),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "upi"]),
});