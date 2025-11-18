import { tokenParams, verifyToken } from '@/utils/jwt';
import { Context, Next } from 'hono';
import * as HttpStatus from "http-status";

export const checkAccessToken = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Access Token required'
    }, 401);
  }

  const accessToken = authHeader.substring(7);

  try {
    const { email, id, roleId, data } = await verifyToken(
      accessToken
    ) as tokenParams;

    c.set('userId', id);
    c.set('roleId', roleId);
    c.set('beneficiaryId', data?.beneficiary?.beneficiaryIds || []);
    c.set('kitchenId', data?.kitchen?.kitchenIds || []);
    c.set('driverId', data?.driver?.driverIds || []);
    c.set('driverKitchenId', data?.driver?.kitchenId || []);
    c.set('domain', data?.domain || "");
    c.set('userEmail', email);
    c.set('isAppManager', data?.domain === "app_manager");

    await next();

  } catch (error) {
    let errorMessage = 'Invalid or expired Access Token';
    if (error instanceof Error && error.name === 'JWTExpired') {
      errorMessage = 'Access Token expired. Please use your Refresh Token.';
    }

    return c.json({
      success: false,
      error: errorMessage
    }, HttpStatus.default.UNAUTHORIZED);
  }
};
(checkAccessToken as any).__requireAuth = true;