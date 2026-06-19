// src/validations/orderValidation.ts
import { z } from 'zod';

const orderItemSchema = z.object({
    productTypeId: z.string().min(1, "Product type ID is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
    weightGrams: z.number().positive("Weight must be positive"),
    ratePerGram: z.number().positive("Rate must be positive"),
    makingCharges: z.number().min(0, "Making charges cannot be negative").default(0),
    huids: z.array(z.string()).optional(),
});

export const createOrderSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required"),
    items: z.array(orderItemSchema).min(1, "At least one item is required"),
    notes: z.string().max(1000).optional(),
    paymentDueDate: z.string().datetime().optional().or(z.literal("")),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(["pending", "approved", "dispatched", "delivered", "cancelled"]),
});

export const updateOrderSchema = z.object({
    notes: z.string().max(1000).optional(),
    paymentDueDate: z.string().datetime().optional().or(z.literal("")),
    status: z.enum(["pending", "approved", "dispatched", "delivered", "cancelled"]).optional(),
});