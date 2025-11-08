import { catchAsync } from "@/utils/catchAsync";
import { verifyToken, generateToken, generateRefreshToken } from "@/utils/jwt";
import ApiError from "@/utils/ApiError";
import { saveTokenServiceClient, validateRefreshTokenServiceClient } from "@/services/clients/user.service";
import { refreshTokenSchemaType } from "@/validator/auth.validator";
import * as HttpStatus from "http-status";
import { parseDeviceInfo } from "@/utils/device.util";
import { REDIS_PERMIISONS_KEY_PREFIX, TIMESTAMP_30_DAYS } from "@/constants/config";
import redis from "@/constants/redis";
import { getUserRolePermissonsClientService } from "@/services/clients/role.permissions.service";

export const refreshHandler = catchAsync(async (c) => {
  const { refreshToken } = await c.get("validatedData") as refreshTokenSchemaType;

  if (!refreshToken) {
    throw new ApiError(HttpStatus.default.BAD_REQUEST, { message: "Refresh token required" });
  }

  const decoded: any = await verifyToken(refreshToken);


  if (!decoded || decoded.type !== "refresh" || !decoded.id || !decoded.email) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Invalid refresh token payload" });
  }

  const tokenRecord = await validateRefreshTokenServiceClient(refreshToken);


  if (!tokenRecord || tokenRecord.isDeleted || tokenRecord.expiresAt < new Date()) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Refresh token has expired or been revoked" });
  }

  const newAccessToken = await generateToken(
    {
      id: decoded.id,
      email: decoded.email,
      roleId: decoded.roleId,
    },
  );

  const { tmpExp, token: newRefreshToken } = await generateRefreshToken(
    {
      id: decoded.id,
      email: decoded.email,
      roleId: decoded.roleId,
    },
  );
  const deviceInfo = parseDeviceInfo(c);

  const roleId = decoded.roleId;
  if (roleId) {
    const permissions = await getUserRolePermissonsClientService({ roleId });

    if (permissions) {
      const redisKey = `${REDIS_PERMIISONS_KEY_PREFIX}${roleId}`;

      await redis.set(
        redisKey,
        JSON.stringify(permissions),
        "PX",
        TIMESTAMP_30_DAYS
      );
      console.log(`Permissions cached for user ${roleId}`);
    }
  }



  await saveTokenServiceClient(decoded.id, newRefreshToken, tmpExp, deviceInfo.ip, `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`);

  return c.json({
    data: {
      authorization: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    },
  });
});