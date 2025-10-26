import { Context, Next } from 'hono';
import { getPermissionsByRoleIdFromRedis } from '@/utils/redis.util';
import { CustomError } from '@/utils/ApiError';
import { ContentfulStatusCode } from 'hono/utils/http-status';

const mapMethodToAction = (method: string): 'read' | 'write' | 'update' | 'delete' => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'write';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
};

/**
 *  (misal: /api/v1/users/123 -> /api/users)
 * * @param path Path request penuh (misal: /api/v1/users/123/details)
 * @returns Resource path canonical (misal: /api/users/details)
 */
const getCanonicalResource = (path: string): string => {
  let segments = path.split('?')[0].split('/').filter(s => s.length > 0 && s !== 'api' && !s.startsWith('v'));

  if (segments.length === 0) {
    return '/api';
  }

  const mainResource = segments[0];

  if (segments.includes('details')) {
    return `/api/${mainResource}/details`;
  }

  return `/api/${mainResource}`;
};


export const permission =
  () =>
    async (c: Context, next: Next) => {

      const requiredResource = getCanonicalResource(c.req.path);
      const requiredAction = mapMethodToAction(c.req.method);

      const roleId = c.get('roleId') || 'super-admin-uuid';
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      try {
        const userPermissions = await getPermissionsByRoleIdFromRedis(roleId);

        if (!userPermissions || userPermissions.length === 0) {
          return c.json({ error: 'No permissions assigned to role' }, 403);
        }


        const isAuthorized = userPermissions.some((p: any) =>
          p.resource === requiredResource && p.action === requiredAction
        );
        console.log(isAuthorized, "-----requiredResource-----", requiredResource);

        if (isAuthorized) {
          await next();
        } else {
          console.log(`[AUTH FAILED] User ${userId} (Role ${roleId}) denied access to ${requiredResource}:${requiredAction} [Method: ${c.req.method}]`);
          return c.json({
            error: 'Insufficient permissions',
            requested: `${requiredResource}:${requiredAction}`
          }, 403);
        }

      } catch (err: any) {
        if (err instanceof CustomError) return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
        console.error('Error during permission check:', err);
        return c.json({ error: 'Internal Server Error' }, 500);
      }
    };
