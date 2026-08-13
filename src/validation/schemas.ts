import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(["client"]).optional(),
  telephone: z.string().min(6).max(50),
  sexe: z.enum(["homme", "femme"]),
  picture: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .max(500_000, { message: "Image capacity too large (max 280 KB)" })
      .optional()
  ),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const socialAuthSchema = z
  .object({
    id_token: z.string().min(1).optional(),
    access_token: z.string().min(1).optional(),
    telephone: z.string().min(6).max(50).optional(),
    sexe: z.enum(["homme", "femme"]).optional(),
  })
  .refine((d) => Boolean(d.id_token || d.access_token), {
    message: "id_token or access_token is required",
  });

export const initiatePaymentSchema = z.object({
  ticket_id: z.coerce.number().int().positive(),
  method: z.enum(["mtn_momo", "orange_money"]),
  phone: z.string().min(6).max(50).optional(),
});

export const mtnCallbackSchema = z.object({
  reference: z.string().min(1).max(100),
  status: z.enum(["successful", "failed", "pending"]),
  transaction_id: z.string().max(100).optional(),
});

export const reserveTicketSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(10),
  customer_name: z.string().min(1).max(255),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().min(6).max(50),
});
