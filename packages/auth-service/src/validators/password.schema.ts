import { z } from "zod";

export const PasswordSchema = z
  .string()
  .min(8, "Minimal 8 karakter")
  .max(128, "Maksimal 128 karakter")
  .regex(/[A-Z]/, "Harus mengandung huruf besar")
  .regex(/\d/, "Harus mengandung angka");
// .regex(/[!@#$%^&*(),.?":{}|<>]/, "Harus mengandung karakter spesial");

export type PasswordSchemaType = z.infer<typeof PasswordSchema>;
