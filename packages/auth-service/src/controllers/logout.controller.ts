import { revokeRefreshTokenServiceClient } from "@/services/clients/user.service";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { refreshTokenSchemaType } from "@/validator/auth.validator";
import * as HttpStatus from "http-status";

export const logoutHandler = catchAsync(async (c) => {
  const { refreshToken }: refreshTokenSchemaType = await c.get("validatedData");

  if (!refreshToken) {
    throw new ApiError(HttpStatus.default.BAD_REQUEST, { message: "Refresh token required" });
  }

  // const decoded = await verifyRefreshToken(refreshToken);
  // if (!decoded) {
  //   throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Invalid refresh token" });
  // }

  await revokeRefreshTokenServiceClient(refreshToken, true);

  return c.json({ message: "Logout successful" });
});
