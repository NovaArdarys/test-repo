import { catchAsync } from "../../utils/catchAsync";
import { isEmpty } from "lodash";
import { 
  getMenusByRoleId, 
  getMenusList, 
  syncMenusToRole,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuById
} from "@/services/repositories/role.menu.service";

export const getMenusByRoleIdHandler = catchAsync(async (c) => {
  const roleId = c.req.param('roleId');
  const menus = await getMenusByRoleId(roleId);

  return c.json({
    data: menus,
  });
});

export const getMenusListHandler = catchAsync(async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  
  const result = await getMenusList({ page, limit });

  return c.json(result);
});

export const syncMenusToRoleHandler = catchAsync(async (c) => {
  const roleId = c.req.param('roleId');
  const { menuIds } = await c.req.json();
  const userId = c.get('userId');

  const result = await syncMenusToRole(roleId, menuIds, userId);

  return c.json(result);
});

export const createMenuHandler = catchAsync(async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await createMenu({ ...body, createdBy: userId });

  return c.json(result);
});

export const updateMenuHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const userId = c.get('userId');

  const result = await updateMenu(id, { ...body, updatedBy: userId });

  return c.json(result);
});

export const deleteMenuHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const result = await deleteMenu(id, userId);

  return c.json(result);
});

export const getMenuByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const menu = await getMenuById(id);

  if (!menu) {
    return c.json({ message: 'Menu not found' }, 404);
  }

  return c.json({ data: menu });
});
