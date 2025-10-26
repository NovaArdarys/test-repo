import z from "zod";
import { paginationSchema } from "./globa.validator";

export const createRoleSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
});

export const updateRoleSchema = createRoleSchema.partial();
export type UpdateRoleSchemaType = z.infer<typeof updateRoleSchema>;

export const createPermissionSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['API', 'WEBSITE', 'MOBILE']),
  resource: z.string().max(255),
  action: z.string().max(50),
});

export const updatePermissionSchema = createPermissionSchema.partial();
export type CreatePermissionSchemaType = z.infer<typeof createPermissionSchema>;

export const permissionListQuerySchema = paginationSchema.extend({
  type: z.enum(['API', 'WEBSITE', 'MOBILE']).optional(),
});

export const rolePermissionSyncSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, "Daftar ID izin tidak boleh kosong."),
});

export const userListQuerySchema = paginationSchema.extend({
  isActive: z.preprocess((a) => a === 'true', z.boolean()).optional(),
});