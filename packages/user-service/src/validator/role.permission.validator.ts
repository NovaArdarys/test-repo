import z from "zod";
import { paginationSchema } from "./global.validator";

export const CreateRoleSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
});

export const UpdateRoleSchema = CreateRoleSchema.partial();
export type UpdateRoleSchemaType = z.infer<typeof UpdateRoleSchema>;

export const CreatePermissionSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['API', 'WEBSITE', 'MOBILE']),
  resource: z.string().max(255),
  action: z.string().max(50),
});

export const UpdatePermissionSchema = CreatePermissionSchema.partial();
export type CreatePermissionSchemaType = z.infer<typeof CreatePermissionSchema>;

export const PermissionListQuerySchema = paginationSchema.extend({
  type: z.enum(['API', 'WEBSITE', 'MOBILE']).optional(),
});

export const RolePermissionSyncSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, "Daftar ID izin tidak boleh kosong."),
});

export const UserListQuerySchema = paginationSchema.extend({
  isActive: z.preprocess((a) => a === 'true' ? true : a === 'false' ? false : undefined, z.boolean()).optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  kitchenId: z.string().uuid().optional(),
});