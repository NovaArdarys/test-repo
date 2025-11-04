import { Context } from 'hono';
import * as AuthManagementService from '@/services/repositories/role.permission.service';
import { PermissionType } from '@/db/schemas';
import { CreatePermissionSchemaType, UpdateRoleSchemaType } from '@/validator/role.permission.validator';
import { catchAsync } from '@/utils/catchAsync';

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});


// --- role ---

export const listRolesHandler = catchAsync(async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');

  const data = await AuthManagementService.getRolesList({ page, limit });
  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createRoleHandler = catchAsync(async (c) => {
  const data = await c.req.parseBody() as unknown as UpdateRoleSchemaType;
  const audit = getAuditFields(c);

  if (!data.name || typeof data.name !== 'string') {
    return c.json({ error: 'Role name is required and must be a string' }, 400);
  }

  const newRole = await AuthManagementService.createRole({
    name: data.name,
    description: data.description ?? null,
    createdBy: audit.createdBy,
    updatedAt: audit.updatedAt,
  });
  return c.json({
    message: 'Role created successfully', data: newRole
  }, 201);
});


export const getRoleByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const role = await AuthManagementService.getRoleById(id);

  if (!role) return c.json({ error: 'Role not found' }, 404);
  return c.json({ data: role }, 200);
});


export const updateRoleHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const data = await c.req.parseBody();
  const audit = getAuditFields(c);

  const result = await AuthManagementService.updateRole(id, { ...data, updatedBy: audit.updatedBy });
  return c.json({ message: 'Role updated successfully', data: { id: result.id } }, 200);
});


export const deleteRoleHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const audit = getAuditFields(c);

  const result = await AuthManagementService.deleteRole(id, audit.updatedBy);
  return c.json({ message: 'Role soft deleted successfully', data: { id: result.id } }, 200);
});

// --- permission ---

export const listPermissionsHandler = catchAsync(async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const type = query.type as PermissionType | undefined;

  const data = await AuthManagementService.getPermissionsList({ page, limit, type });
  return c.json({ data: data.data, meta: data.meta }, 200);
});


export const createPermissionHandler = catchAsync(async (c) => {
  const data = await c.req.parseBody() as unknown as CreatePermissionSchemaType;
  const audit = getAuditFields(c);

  const newPermission = await AuthManagementService.createPermission({
    ...data, ...audit,
  });
  return c.json({ message: 'Permission created successfully', data: newPermission }, 201);
});

export const getPermissionByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const permission = await AuthManagementService.getPermissionById(id);

  if (!permission) return c.json({ error: 'Permission not found' }, 404);
  return c.json({ data: permission }, 200);
});

export const updatePermissionHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const data = await c.req.parseBody();
  const audit = getAuditFields(c);

  const result = await AuthManagementService.updatePermission(id, { ...data, updatedBy: audit.updatedBy });
  return c.json({ message: 'Permission updated successfully', data: { id: result.id } }, 200);
});


export const deletePermissionHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const audit = getAuditFields(c);

  const result = await AuthManagementService.deletePermission(id, audit.updatedBy);
  return c.json({ message: 'Permission soft deleted successfully', data: { id: result.id } }, 200);
});
