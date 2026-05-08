import redis from '@/constants/redis';
import { REDIS_MENUS_KEY_PREFIX, REDIS_PERMIISONS_KEY_PREFIX } from '@/constants/config';
import { getUserRolePermissonsClientService } from '@/services/clients/role.permissions.service';
import { getUserRoleMenusClientService } from './clients/role.menu.service';

// Redis TTL: 30 days expressed in milliseconds for use with the PX option.
const THIRTY_DAYS_MS = 60 * 60 * 24 * 30 * 1000;

/**
 * Fetches the role permissions from the user-service client and caches them
 * in Redis with a 30-day TTL. Called after login and token refresh.
 *
 * NOTE: This logic was previously duplicated verbatim inside both
 * login.controller.ts and refresh.controller.ts — centralised here so any
 * future changes (TTL, serialisation format, etc.) only need one edit.
 */
export async function cacheRolePermissions(roleId: string): Promise<void> {
  const permissions = await getUserRolePermissonsClientService({ roleId });

  if (permissions) {
    const redisKey = `${REDIS_PERMIISONS_KEY_PREFIX}${roleId}`;

    await redis.set(redisKey, JSON.stringify(permissions), 'PX', THIRTY_DAYS_MS);
    console.log(`Permissions cached for role ${roleId}`);
  }
}

/**
 * Fetches the role menus from the user-service client and caches them
 * in Redis with a 30-day TTL.
 */
export async function cacheRoleMenus(roleId: string): Promise<void> {
  const menus = await getUserRoleMenusClientService({ roleId });

  if (menus) {
    const redisKey = `${REDIS_MENUS_KEY_PREFIX}${roleId}`;

    await redis.set(redisKey, JSON.stringify(menus), 'PX', THIRTY_DAYS_MS);
    console.log(`Menus cached for role ${roleId}`);
  }
}

/**
 * Centralised function to cache all role access data (permissions and menus).
 */
export async function cacheRoleAccess(roleId: string): Promise<void> {
  await Promise.all([
    cacheRolePermissions(roleId),
    cacheRoleMenus(roleId)
  ]);
}
