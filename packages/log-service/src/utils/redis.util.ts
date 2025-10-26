import { REDIS_PERMIISONS_KEY_PREFIX } from "@/constants/config";
import redis from "@/constants/redis";
import { getPermissionsByRoleId } from "@/services/repositories/role.permission.service";
import { isEmpty } from "lodash";

interface PermissionSchema {
  resource: string;
  action: string;
}

export async function getPermissionsByRoleIdFromRedis(roleId: string): Promise<PermissionSchema[] | null> {
  const key = `${REDIS_PERMIISONS_KEY_PREFIX}${roleId}`;
  const redisData = await redis.get(key);
  if (redisData) {
    const parsedData = JSON.parse(redisData);

    if (!isEmpty(parsedData)) {
      return parsedData;
    }
    return null;

  }
  return null;
}
