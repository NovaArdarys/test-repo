import { catchAsync } from "../../utils/catchAsync";
import { isEmpty } from "lodash";
import { 
  getRolesList, 
  createRole, 
  getRoleById, 
  updateRole, 
  deleteRole,
  getPermissionsByRoleId,
  syncPermissionsToRole
} from "@/services/repositories/role.permission.service";

export const getRolesListHandler = catchAsync(async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const userId = c.get('userId');

  const result = await getRolesList({ page, limit, userId });

  return c.json(result);
});

export const createRoleHandler = catchAsync(async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await createRole({ ...body, createdBy: userId });

  return c.json(result);
});

export const getRoleByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const role = await getRoleById(id);

  if (!role) {
    return c.json({ message: 'Role not found' }, 404);
  }

  return c.json({ data: role });
});

export const updateRoleHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await updateRole(id, { ...body, updatedBy: userId });

  return c.json(result);
});

export const deleteRoleHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const result = await deleteRole(id, userId);

  return c.json(result);
});

export const getPermissionsByRoleIdHandler = catchAsync(async (c) => {
  const roleId = c.req.param('roleId');
  const permissions = await getPermissionsByRoleId(roleId);

  return c.json({
    data: permissions,
  });
});

export const syncPermissionsToRoleHandler = catchAsync(async (c) => {
  const roleId = c.req.param('roleId');
  const { permissionIds } = await c.req.json();

  const result = await syncPermissionsToRole(roleId, permissionIds);

  return c.json(result);
});
