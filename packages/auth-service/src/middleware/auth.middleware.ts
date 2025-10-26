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
    c.set('userEmail', email);

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