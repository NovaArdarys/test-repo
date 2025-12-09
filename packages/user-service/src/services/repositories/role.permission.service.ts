import {
  roles,
  permissions,
  rolePermissions,
  type CreateRoleInput,
  type UpdateRoleInput,
  type CreatePermissionInput,
  type UpdatePermissionInput,
  PermissionType,
  entityTypeEnum
} from "@/db/schemas";
import {
  and,
  eq,
  desc,
  sql,
  inArray,
  notInArray,
  exists,
  asc
} from "drizzle-orm";
import { db } from "@/db";
import { APIPagination } from "@/types/paginations.type"; // Import tipe yang Anda definisikan
import ApiError from "@/utils/ApiError";
import * as HttpStatus from "http-status";
export type EntityType = (typeof entityTypeEnum.enumValues)[number];

type RoleRead = {
  id: string;
  name: string;
  description: string | null;
  domain: EntityType;
};

type PermissionRead = {
  id: string;
  name: string;
  type: PermissionType;
  resource: string;
  action: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getRolesList({ page, limit }: {
  page: number;
  limit: number;
}) {
  const offset = (page - 1) * limit;

  const whereCondition = eq(roles.isDeleted, false);

  const dataPromise = db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      domain: roles.domain
    })
    .from(roles)
    .where(whereCondition)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(roles.name));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(roles)
    .where(whereCondition)
    .execute();

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data.map(r => ({
      ...r,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}


export async function createRole(data: CreateRoleInput & { createdBy: string; }) {
  const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, data.name)).limit(1);
  if (existing.length) {
    throw new ApiError(HttpStatus.default.CONFLICT, { message: `Role name '${data.name}' already exists.` });
  }

  const [newRole] = await db.insert(roles).values({
    ...data,
    updatedAt: new Date(),
    updatedBy: data.createdBy,
    isDeleted: false,
  }).returning({ id: roles.id, name: roles.name });

  return { id: newRole.id, name: newRole.name };
}

export async function getRoleById(id: string) {
  const role = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      isDeleted: roles.isDeleted,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
      domain: roles.domain
    })
    .from(roles)
    .where(and(
      eq(roles.id, id),
      eq(roles.isDeleted, false)
    ))
    .limit(1);

  return role.length ? role[0] : null;
}

export async function updateRole(id: string, data: UpdateRoleInput & { updatedBy: string; }) {

  const [updatedRole] = await db
    .update(roles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(roles.id, id),
      eq(roles.isDeleted, false)
    ))
    .returning({ id: roles.id });

  if (!updatedRole) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Role not found or cannot be updated.' });
  }

  return { id: updatedRole.id };
}


export async function deleteRole(id: string, updatedBy: string) {
  const [deletedRole] = await db
    .update(roles)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
      updatedBy: updatedBy,
    })
    .where(eq(roles.id, id))
    .returning({ id: roles.id });

  if (!deletedRole) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Role not found or already deleted.' });
  }

  return { id: deletedRole.id };
}

export async function getPermissionsByRoleId(roleId: string): Promise<PermissionRead[]> {
  const permissionsList = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      type: permissions.type,
      resource: permissions.resource,
      action: permissions.action,
      isDeleted: permissions.isDeleted,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt,
    })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(
      eq(rolePermissions.roleId, roleId),
      eq(permissions.isDeleted, false)
    ));

  return permissionsList;
}


export async function syncPermissionsToRole(roleId: string, permissionIds: string[]) {

  const roleExists = await getRoleById(roleId);
  if (!roleExists) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Role not found.' });
  }

  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissionIds.length > 0) {
      const newAssignments = permissionIds.map(permId => ({
        roleId: roleId,
        permissionId: permId,
      }));
      await tx.insert(rolePermissions).values(newAssignments);
    }
  });

  return { roleId, message: `Successfully synced ${permissionIds.length} permissions to role ${roleId}.` };
}

export async function getPermissionsList({ page, limit, type }: {
  page: number;
  limit: number;
  type?: PermissionType;
}): Promise<APIPagination<PermissionRead>> {
  const offset = (page - 1) * limit;

  const whereConditions = [
    eq(permissions.isDeleted, false),
  ];

  if (type) {
    whereConditions.push(eq(permissions.type, type));
  }

  const dataPromise = db
    .select({
      id: permissions.id,
      name: permissions.name,
      type: permissions.type,
      resource: permissions.resource,
      action: permissions.action,
      isDeleted: permissions.isDeleted,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt,
    })
    .from(permissions)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(permissions.createdAt));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(permissions)
    .where(and(...whereConditions))
    .execute();

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data.map(p => ({
      ...p,
      isDeleted: p.isDeleted,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}

export async function createPermission(data: CreatePermissionInput & { createdBy: string; }) {

  const [newPermission] = await db.insert(permissions).values({
    ...data,
    updatedAt: new Date(),
    updatedBy: data.createdBy,
    isDeleted: false,
  }).returning({ id: permissions.id, name: permissions.name });

  return { id: newPermission.id, name: newPermission.name };
}

export async function getPermissionById(id: string): Promise<PermissionRead | null> {
  const permission = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      type: permissions.type,
      resource: permissions.resource,
      action: permissions.action,
      isDeleted: permissions.isDeleted,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt,
    })
    .from(permissions)
    .where(and(
      eq(permissions.id, id),
      eq(permissions.isDeleted, false)
    ))
    .limit(1);

  return permission.length ? permission[0] : null;
}

export async function updatePermission(id: string, data: UpdatePermissionInput & { updatedBy: string; }) {

  const [updatedPermission] = await db
    .update(permissions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(permissions.id, id),
      eq(permissions.isDeleted, false)
    ))
    .returning({ id: permissions.id });

  if (!updatedPermission) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Permission not found or cannot be updated.' });
  }

  return { id: updatedPermission.id };
}


export async function deletePermission(id: string, updatedBy: string) {
  const [deletedPermission] = await db
    .update(permissions)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
      updatedBy: updatedBy,
    })
    .where(eq(permissions.id, id))
    .returning({ id: permissions.id });

  if (!deletedPermission) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Permission not found or already deleted.' });
  }

  return { id: deletedPermission.id };
}