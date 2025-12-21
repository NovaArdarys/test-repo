import ApiError from "../utils/ApiError";
import { catchAsync } from "../utils/catchAsync";
import { has, isEmpty } from "lodash";
import * as HttpStatus from "http-status";
import { bcryptVerify } from "@/utils/hashing";
import { generateRefreshToken, generateToken } from "@/utils/jwt";
import { getUserInfoServiceClient, saveTokenServiceClient } from "@/services/clients/user.service";
import { publishUserLoggedIn } from "@/messaging/publishers/auth.publisher";
import { parseDeviceInfo } from "@/utils/device.util";
import { REDIS_PERMIISONS_KEY_PREFIX, TIMESTAMP_30_DAYS } from "@/constants/config";
import redis from "@/constants/redis";
import { getUserRolePermissonsClientService } from "@/services/clients/role.permissions.service";

export const loginHandler = catchAsync(async (c) => {
  const { password, username, captchaToken } = await c.get("validatedData").body;

  const findUser = await getUserInfoServiceClient({ username });

  if (isEmpty(findUser)) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Unauthorized" });
  }

  if (!findUser.isActive) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Unauthorized" });
  }

  let captchaScore = null;

  if (has(c.get("validatedData").body, "captchaToken")) {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET!,
          response: captchaToken,
        }),
      }
    );

    const result = await response.json();
    console.log("verify result:", result);

    if (!result.success) {
      throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
        message: "Captcha verification failed",
      });
    }

    captchaScore = result.score;
  } else {
    console.log("⚠️ captcha token missing — skipping verification");
  }


  if (captchaScore !== null && captchaScore < 0.5) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, {
      message: "Captcha score too low",
    });
  }


  const verifiedPassword = await bcryptVerify(password, findUser.password);
  if (!verifiedPassword) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Unauthorized" });
  }

  const roleId = findUser.userRoles?.[0]?.role?.id;
  const domain = findUser.userRoles?.[0]?.role?.domain;
  const subDomain = findUser.userRoles?.[0]?.role?.subDomains;
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

  console.log(findUser.userRoles?.[0].role, "===== ok ======");


  let context = {
    domain: domain ?? "",
    subDomain: subDomain ?? [],
    beneficiary: {},
    kitchen: {},
    driver: {},
  };

  if (findUser.userKitchens?.length > 0) {
    context.kitchen = {
      type: 'kitchen',
      kitchenIds: findUser.userKitchens.map((k: any) => k.kitchenId).slice(0, 5),
    };
  } else if (findUser.userBeneficiaries?.length > 0) {
    context.beneficiary = {
      type: 'beneficiary',
      beneficiaryIds: findUser.userBeneficiaries.map((s: any) => s.beneficiaryId).slice(0, 5),
    };
  } else if (findUser.drivers?.length > 0) {
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
    roleId: roleId,
  };
  console.log({ ...payload, data: context }, "====ok=====");

  const accessToken = await generateToken({ ...payload, data: context });
  const { token, tmpExp } = await generateRefreshToken(payload);
  const deviceInfo = parseDeviceInfo(c);

  const tokenData = await saveTokenServiceClient(findUser.id, token, tmpExp, deviceInfo.ip, `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`);


  await publishUserLoggedIn({
    userId: findUser.id,
    email: findUser.email,
    tokenId: tokenData.id,
    ipAddress: deviceInfo.ip,
    deviceInfo: `${deviceInfo.deviceType} | ${deviceInfo.browser} on ${deviceInfo.os}`,
    details: {
      username
    }
  });

  return c.json({
    data: {
      email: findUser.email,
      subDomain,
      domain,
      roleName: findUser.userRoles?.[0]?.role?.name,
      authorization: {
        token: accessToken,
        refreshToken: token,
      },
    },
  });
});
