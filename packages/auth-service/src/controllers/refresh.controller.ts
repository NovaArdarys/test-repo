import { catchAsync } from '@/utils/catchAsync';
import { verifyToken, generateToken, generateRefreshToken } from '@/utils/jwt';
import ApiError from '@/utils/ApiError';
import { getUserInfoServiceClient, saveTokenServiceClient, validateRefreshTokenServiceClient } from '@/services/clients/user.service';
import { RefreshTokenSchemaType } from '@/validators';
import * as HttpStatus from 'http-status';
import { parseDeviceInfo } from '@/utils/device.util';
import { cacheRoleAccess } from '@/services/permissions.service';

export const refreshHandler = catchAsync(async (c) => {
  const { refreshToken }: RefreshTokenSchemaType = await c.get('validatedData').body;

  if (!refreshToken) {
    throw new ApiError(HttpStatus.default.BAD_REQUEST, { message: 'Refresh token required' });
  }

  const decoded: any = await verifyToken(refreshToken);

  if (!decoded || decoded.type !== 'refresh' || !decoded.id || !decoded.email) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Invalid refresh token payload' });
  }

  const tokenRecord = await validateRefreshTokenServiceClient(refreshToken);

  if (!tokenRecord || tokenRecord.isDeleted || tokenRecord.expiresAt < new Date()) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Refresh token has expired or been revoked' });
  }

  const findUser = await getUserInfoServiceClient({ username: decoded.email });

  if (!findUser || !findUser.isActive) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'User is inactive or not found' });
  }

  const roleId = findUser.userRoles?.[0]?.role?.id || decoded.roleId;
  const domain = findUser.userRoles?.[0]?.role?.domain;
  const subDomain = findUser.userRoles?.[0]?.role?.subDomains;

  const context = {
    domain: domain ?? '',
    subDomain: subDomain ?? [],
    beneficiary: {} as Record<string, unknown>,
    kitchen: {} as Record<string, unknown>,
    driver: {} as Record<string, unknown>,
  };

  if (findUser.userKitchens?.length > 0) {
    const inactiveKitchen = findUser.userKitchens.find((uk: any) => uk.kitchen?.status !== 'AKTIF');
    if (inactiveKitchen) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Dapur Anda tidak aktif atau sedang ditangguhkan' });
    }
    context.kitchen = {
      type: 'kitchen',
      kitchenIds: findUser.userKitchens.map((k: any) => k.kitchenId).slice(0, 5),
    };
  }

  if (findUser.userBeneficiaries?.length > 0) {
    const inactiveBeneficiary = findUser.userBeneficiaries.find((ub: any) => ub.beneficiary?.status !== 'AKTIF');
    if (inactiveBeneficiary) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Lembaga penerima (Beneficiary) Anda tidak aktif' });
    }
    context.beneficiary = {
      type: 'beneficiary',
      beneficiaryIds: findUser.userBeneficiaries.map((s: any) => s.beneficiaryId).slice(0, 5),
    };
  }

  if (findUser.drivers?.length > 0) {
    const driver = findUser.drivers[0];
    if (!driver.isActive) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Akun Driver Anda tidak aktif' });
    }
    if (driver.kitchen?.status !== 'AKTIF') {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: 'Dapur afiliasi Driver Anda tidak aktif' });
    }
    context.driver = {
      type: 'driver',
      driverIds: findUser.drivers.map((d: any) => d.id).slice(0, 5),
      kitchenIds: findUser.drivers.map((d: any) => d.kitchenId).slice(0, 5),
    };
    context.kitchen = {
      type: 'kitchen',
      kitchenIds: findUser.drivers.map((d: any) => d.kitchenId).slice(0, 5),
    };
  }

  const newAccessToken = await generateToken({
    id: decoded.id,
    email: decoded.email,
    roleId: roleId,
    data: context,
  });

  const { tmpExp: tokenExpiresAt, token: newRefreshToken } = await generateRefreshToken({
    id: decoded.id,
    email: decoded.email,
    roleId: decoded.roleId,
  });

  const deviceInfo = parseDeviceInfo(c);

  if (roleId) {
    await cacheRoleAccess(roleId);
  }

  await saveTokenServiceClient(
    decoded.id,
    newRefreshToken,
    tokenExpiresAt,
    deviceInfo.ip,
    `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`
  );

  return c.json({
    data: {
      authorization: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    },
  });
});