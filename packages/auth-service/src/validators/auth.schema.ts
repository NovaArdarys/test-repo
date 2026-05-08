import { z } from "zod";
import { uploadFileSchema } from "./global.validator";

import { PasswordSchema } from "./password.schema";
import {
  EmailSchema,
  UsernameSchema,
  UserDetailSchema,
} from "./user.schema";

// LOGIN

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: z.string().min(1, "Password is required"),
  captchaToken: z.string().optional(),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;

// REGISTER

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  file: uploadFileSchema,

  roleId: z.string(),
  domainId: z.string().optional(),

  driverCapacity: z.coerce.number().optional(),
  isActive: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean()).optional(),

  ...UserDetailSchema.shape,
});

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;


// TOKEN

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenSchemaType = z.infer<typeof RefreshTokenSchema>;

// PASSWORD RECOVERY

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
