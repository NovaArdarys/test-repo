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

export const userDetailSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phoneNumber: z.string().max(20).optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().pipe(z.coerce.date()).optional(),
    email: z.string().optional(),
    storageId: z.string().optional(),
    imageURL: z.string().optional(),

    password: z.string().optional().nullable(),
    confirmationPassword: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const password = data.password;
    const confirm = data.confirmationPassword;

    if (!password || password.trim() === "") return;

    if (password.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password minimal 6 karakter",
      });
    }

    if (!confirm || confirm.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["confirmationPassword"],
        message: "Konfirmasi password wajib diisi",
      });
    }

    if (confirm && password !== confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmationPassword"],
        message: "Konfirmasi password tidak cocok",
      });
    }
  });
export type SaveTokenType = z.infer<typeof saveTokenSchema>;
export type userDetailType = z.infer<typeof userDetailSchema>;

export const registerSchema = userDetailSchema.safeExtend({
  email: z.string({ message: "Email wajib diisi" }),
  roleId: z.string().optional(),
  domainId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  createdBy: z.string().optional()
});

export type registerSchemaType = z.infer<typeof registerSchema>;


export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
  isDeleted: z.coerce.boolean(),
});

export type refreshTokenSchemaType = z.infer<typeof refreshTokenSchema>;

// new

export const createUserSchema = z.object({
  email: z.string("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  isActive: z.boolean().optional(),
});

export const UpdateUserSchemaType = createUserSchema.partial().extend({
  password: z.string().min(8).optional(),
});

export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchemaType>;
