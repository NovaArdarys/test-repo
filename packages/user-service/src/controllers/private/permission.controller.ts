import { catchAsync } from "../../utils/catchAsync";
import { 
  getPermissionsList, 
  createPermission, 
  getPermissionById, 
  updatePermission, 
  deletePermission 
} from "@/services/repositories/role.permission.service";

export const getPermissionsListHandler = catchAsync(async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const type = c.req.query('type') as any;

  const result = await getPermissionsList({ page, limit, type });

  return c.json(result);
});

export const createPermissionHandler = catchAsync(async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await createPermission({ ...body, createdBy: userId });

  return c.json(result);
});

export const getPermissionByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const permission = await getPermissionById(id);

  if (!permission) {
    return c.json({ message: 'Permission not found' }, 404);
  }

  return c.json({ data: permission });
});

export const updatePermissionHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await updatePermission(id, { ...body, updatedBy: userId });

  return c.json(result);
});

export const deletePermissionHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const result = await deletePermission(id, userId);

  return c.json(result);
});
