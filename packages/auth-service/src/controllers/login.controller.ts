import ApiError from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { has, isEmpty } from 'lodash';
import * as HttpStatus from 'http-status';
import { bcryptVerify } from '@/utils/hashing';
import { generateRefreshToken, generateToken } from '@/utils/jwt';
import { getUserInfoServiceClient, saveTokenServiceClient } from '@/services/clients/user.service';
import { publishUserLoggedIn } from '@/messaging/publishers/auth.publisher';
import { parseDeviceInfo } from '@/utils/device.util';
import { cacheRoleAccess } from '@/services/permissions.service';

export const loginHandler = catchAsync(async (c) => {
  const { password, username, captchaToken } = await c.get('validatedData').body;

  const findUser = await getUserInfoServiceClient({ username });

  console.log(findUser);

  if (isEmpty(findUser)) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
      message: 'Unauthorized',
      details: [{ message: 'Username atau password salah' }]
    });
  }

  if (!findUser.isActive) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
      message: 'Unauthorized',
      details: [{ message: 'Akun Anda tidak aktif' }]
    });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET;

  if (has(c.get('validatedData').body, 'captchaToken')) {
    if (isEmpty(captchaToken)) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: 'Unauthorized',
        details: [{ message: 'Captcha token tidak ditemukan' }]
      });
    } else {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: turnstileSecret || "",
            response: captchaToken,
            remoteip: c.req.header('x-forwarded-for') || '',
          }),
        }
      );

      const result = await response.json();
      console.log('turnstile verify result:', result);

      if (!result.success) {
        throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
          message: 'Captcha verification failed',
          details: [{ message: JSON.stringify(result) }]
        });
      }
    }
  }

  const verifiedPassword = await bcryptVerify(password, findUser.password);
  if (!verifiedPassword) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
      message: 'Unauthorized',
      details: [{ message: 'Username atau password salah' }]
    });
  }

  const roleId = findUser.userRoles?.[0]?.role?.id;
  const domain = findUser.userRoles?.[0]?.role?.domain;
  const subDomain = findUser.userRoles?.[0]?.role?.subDomains;

  if (roleId) {
    await cacheRoleAccess(roleId);
  }
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
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: 'Unauthorized',
        details: [{ message: 'Dapur Anda tidak aktif atau sedang ditangguhkan' }]
      });
    }
    context.kitchen = {
      type: 'kitchen',
      kitchenIds: findUser.userKitchens.map((k: any) => k.kitchenId).slice(0, 5),
    };
  }

  if (findUser.userBeneficiaries?.length > 0) {
    const inactiveBeneficiary = findUser.userBeneficiaries.find((ub: any) => ub.beneficiary?.status !== 'AKTIF');
    if (inactiveBeneficiary) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: 'Unauthorized',
        details: [{ message: 'Lembaga penerima (Beneficiary) Anda tidak aktif' }]
      });
    }
    context.beneficiary = {
      type: 'beneficiary',
      beneficiaryIds: findUser.userBeneficiaries.map((s: any) => s.beneficiaryId).slice(0, 5),
    };
  }

  if (findUser.drivers?.length > 0) {
    const driver = findUser.drivers[0]; // Drivers are usually 1-to-1 with users
    if (!driver.isActive) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: 'Unauthorized',
        details: [{ message: 'Akun Driver Anda tidak aktif' }]
      });
    }
    if (driver.kitchen?.status !== 'AKTIF') {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: 'Unauthorized',
        details: [{ message: 'Dapur afiliasi Driver Anda tidak aktif' }]
      });
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

  const payload = {
    id: findUser.id,
    email: findUser.email,
    roleId,
  };

  console.log(context, '====context====', findUser.userRoles);

  const accessToken = await generateToken({ ...payload, data: context });
  const { token: refreshToken, tmpExp: tokenExpiresAt } = await generateRefreshToken(payload);
  const deviceInfo = parseDeviceInfo(c);

  const tokenData = await saveTokenServiceClient(
    findUser.id,
    refreshToken,
    tokenExpiresAt,
    deviceInfo.ip,
    `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`
  );

  await publishUserLoggedIn({
    userId: findUser.id,
    email: findUser.email,
    tokenId: tokenData.id,
    ipAddress: deviceInfo.ip,
    deviceInfo: `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`,
    details: { username },
  });

  return c.json({
    data: {
      email: findUser.email,
      subDomain,
      domain,
      roleName: findUser.userRoles?.[0]?.role?.name,
      roleId: roleId,
      authorization: {
        token: accessToken,
        refreshToken,
      },
    },
  });
});
