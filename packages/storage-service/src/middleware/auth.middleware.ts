import { tokenParams, verifyToken } from '@/utils/jwt';
import { Context, Next } from 'hono';
import * as HttpStatus from "http-status";
import { isEmpty } from 'lodash';

export const checkAccessToken = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Access Token required'
    }, 401);
  }

  const accessToken = authHeader.substring(7);
  const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "secret";

  if (accessToken === SERVICE_TOKEN) {
    c.set('userId', 'service-account');
    c.set('isAppManager', true);
    return await next();
  }

  try {
    const { email, id, roleId, data } = await verifyToken(
      accessToken
    ) as tokenParams;

    const isAppManager = data?.domain === "app_manager";

    const hasScope =
      !isEmpty(data?.beneficiary?.beneficiaryIds) ||
      !isEmpty(data?.kitchen?.kitchenIds) ||
      !isEmpty(data?.driver?.driverIds) ||
      !isEmpty(data?.driver?.kitchenId);

    if (!isAppManager && !hasScope) {
      return c.json(
        { success: false, error: HttpStatus.default['401_MESSAGE'] },
        HttpStatus.default.UNAUTHORIZED
      );
    }

    c.set('userId', id);
    c.set('roleId', roleId);
    c.set('beneficiaryId', data?.beneficiary?.beneficiaryIds || []);
    c.set('kitchenId', data?.kitchen?.kitchenIds || []);
    c.set('driverId', data?.driver?.driverIds || []);
    c.set('driverKitchenId', data?.driver?.kitchenId || []);
    c.set('domain', data?.domain || "");
    c.set('subDomain', data?.subDomain);
    c.set('userEmail', email);
    c.set('isAppManager', data?.domain === "app_manager");

    return await next();

  } catch (error: any) {
    let errorMessage = 'Invalid or expired Access Token';
    if (error.name === 'TokenExpiredError' || error.name === 'JWTExpired') {
      errorMessage = 'Access Token expired. Please use your Refresh Token.';
    }

    return c.json({
      success: false,
      error: errorMessage,
      details: error.message
    }, HttpStatus.default.UNAUTHORIZED);
  }
};
(checkAccessToken as any).__requireAuth = true;