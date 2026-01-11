import { z } from "zod";

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");
// .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol");

export type PasswordSchemaType = z.infer<typeof PasswordSchema>;
