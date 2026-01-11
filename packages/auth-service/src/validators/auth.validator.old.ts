import { z } from "zod";
import { uploadFileSchema } from "./global.validator";

/* =====================================================
 * PRIMITIVE / REUSABLE SCHEMAS
 * ===================================================== */

export const EmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");
// .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol");

export const UsernameSchema = z.string().min(1, "Username is required");

/* =====================================================
 * USER DETAIL
 * ===================================================== */

export const UserDetailSchema = z.object({
  fullName: z.string().max(1000).optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
});

export type UserDetailSchemaType = z.infer<typeof UserDetailSchema>;

/* =====================================================
 * AUTH SCHEMAS
 * ===================================================== */

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: z.string().min(1, "Password is required"),
  captchaToken: z.string().optional(),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  file: uploadFileSchema,

  roleId: z.string(),
  domainId: z.string().optional(),

  driverCapacity: z.coerce.number().optional(),
  isActive: z.coerce.boolean().optional(),

  ...UserDetailSchema.shape,
});

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

/* =====================================================
 * TOKEN
 * ===================================================== */

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenSchemaType = z.infer<typeof RefreshTokenSchema>;

/* =====================================================
 * PASSWORD RECOVERY
 * ===================================================== */

export const ForgotPasswordSchema = z.object({
  username: UsernameSchema,
});

export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirmation do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;
