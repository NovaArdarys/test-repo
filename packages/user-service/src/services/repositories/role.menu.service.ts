import {
  roles,
  appMenus,
  roleMenus,
  type CreateAppMenusInput,
  type UpdateAppMenusInput,
} from "@/db/schemas";
import {
  and,
  eq,
  desc,
  sql,
  asc,
} from "drizzle-orm";
import { db } from "@/db";
import { APIPagination } from "@/types/paginations.type";
import ApiError from "@/utils/ApiError";
import * as HttpStatus from "http-status";

type MenuRead = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  icon: string | null;
  displayOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string | null;
};

/**
 * Get list of all menus
 */
export async function getMenusList({ page, limit }: {
  page: number;
  limit: number;
}): Promise<APIPagination<MenuRead>> {
  const offset = (page - 1) * limit;

  const whereCondition = eq(appMenus.isDeleted, false);

  const dataPromise = db
    .select()
    .from(appMenus)
    .where(whereCondition)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(appMenus.displayOrder), asc(appMenus.name));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(appMenus)
    .where(whereCondition)
    .execute();

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data.map(m => ({
      ...m,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}

/**
 * Create a new application menu
 */
export async function createMenu(data: CreateAppMenusInput & { createdBy: string; }) {
  const [newMenu] = await db.insert(appMenus).values({
    ...data,
    updatedAt: new Date(),
    updatedBy: data.createdBy,
    isDeleted: false,
  }).returning({ id: appMenus.id, name: appMenus.name });

  return { id: newMenu.id, name: newMenu.name };
}

/**
 * Get menu by ID
 */
export async function getMenuById(id: string): Promise<MenuRead | null> {
  const menu = await db
    .select()
    .from(appMenus)
    .where(and(
      eq(appMenus.id, id),
      eq(appMenus.isDeleted, false)
    ))
    .limit(1);

  return menu.length ? menu[0] : null;
}

/**
 * Update application menu
 */
export async function updateMenu(id: string, data: UpdateAppMenusInput & { updatedBy: string; }) {
  const [updatedMenu] = await db
    .update(appMenus)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(appMenus.id, id),
      eq(appMenus.isDeleted, false)
    ))
    .returning({ id: appMenus.id });

  if (!updatedMenu) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Menu not found or cannot be updated.' });
  }

  return { id: updatedMenu.id };
}

/**
 * Delete application menu
 */
export async function deleteMenu(id: string, updatedBy: string) {
  const [deletedMenu] = await db
    .update(appMenus)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
      updatedBy: updatedBy,
    })
    .where(eq(appMenus.id, id))
    .returning({ id: appMenus.id });

  if (!deletedMenu) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Menu not found or already deleted.' });
  }

  return { id: deletedMenu.id };
}

/**
 * Get all menus associated with a specific role
 */
export async function getMenusByRoleId(roleId: string): Promise<MenuRead[]> {
  const menusList = await db
    .select({
      id: appMenus.id,
      name: appMenus.name,
      path: appMenus.path,
      parentId: appMenus.parentId,
      icon: appMenus.icon,
      displayOrder: appMenus.displayOrder,
      isDeleted: appMenus.isDeleted,
      createdAt: appMenus.createdAt,
      createdBy: appMenus.createdBy,
      updatedAt: appMenus.updatedAt,
      updatedBy: appMenus.updatedBy,
    })
    .from(appMenus)
    .innerJoin(roleMenus, eq(appMenus.id, roleMenus.menuId))
    .where(and(
      eq(roleMenus.roleId, roleId),
      eq(appMenus.isDeleted, false),
      eq(roleMenus.isDeleted, false)
    ))
    .orderBy(asc(appMenus.displayOrder));

  return menusList;
}

/**
 * Sync menus to a role (overwrite existing assignments)
 */
export async function syncMenusToRole(roleId: string, menuIds: string[], createdBy: string) {
  const roleExists = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!roleExists.length) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'Role not found.' });
  }

  await db.transaction(async (tx) => {
    // Delete existing role-menu assignments
    await tx.delete(roleMenus).where(eq(roleMenus.roleId, roleId));

    if (menuIds.length > 0) {
      const newAssignments = menuIds.map(menuId => ({
        roleId: roleId,
        menuId: menuId,
        createdBy: createdBy,
      }));
      await tx.insert(roleMenus).values(newAssignments);
    }
  });

  return { roleId, message: `Successfully synced ${menuIds.length} menus to role ${roleId}.` };
}
