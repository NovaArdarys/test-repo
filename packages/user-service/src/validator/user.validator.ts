import { z } from 'zod';

const passwordSchema = z.string()
  .min(1, "Password must be at least 1 character long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/\d/, "Password must contain at least one number.")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol.");

const number = z.union([z.string().min(1), z.number().min(1)])
  .pipe(z.coerce.number())
  .refine((val) => val > 0, {
    message: "expiresAt must be a positive number (timestamp)"
  });

export const userInfoShema = z.object({
  username: z.string().min(1),
});

export type UserInfoShemaType = z.infer<typeof userInfoShema>;

export const saveTokenSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  deviceInfo: z.string(),
  ipAddress: z.string(),
  expiresAt: number,
});

export const userDetailSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().pipe(z.coerce.date()).optional(),
}).partial();

export type SaveTokenType = z.infer<typeof saveTokenSchema>;
export type userDetailType = z.infer<typeof userDetailSchema>;

export const registerSchema = z.object({
  email: z.string().min(1),
  password: passwordSchema,
  createdBy: z.string().optional(),
  ...userDetailSchema.shape,
});

export type registerSchemaType = z.infer<typeof registerSchema>;


export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
  isDeleted: z.coerce.boolean(),
});

export type refreshTokenSchemaType = z.infer<typeof refreshTokenSchema>;

// new

export const createUserSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  is_active: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(8).optional(),
});