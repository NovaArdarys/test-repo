import { z } from 'zod';
import { uploadFileSchema } from './global.validator';

const passwordSchema = z.string()
  .min(1, "Password must be at least 1 character long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/\d/, "Password must contain at least one number.");
// .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol.");

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type loginSchemaType = z.infer<typeof loginSchema>;

export const userDetailSchema = z.object({
  fullName: z.string().max(1000).optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().pipe(z.coerce.date()).optional(),
}).partial();

export const registerSchema = z.object({
  email: z.string().min(1),
  password: passwordSchema,
  file: uploadFileSchema,
  ...userDetailSchema.shape,
});

export type registerSchemaType = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});

export type refreshTokenSchemaType = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  username: z.string().min(1),
});

export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
  confirmPassword: z.string().min(8, "Confirmation password is required"),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirmation do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;