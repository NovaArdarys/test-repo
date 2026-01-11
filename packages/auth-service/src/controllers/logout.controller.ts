import { revokeRefreshTokenServiceClient } from "@/services/clients/user.service";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { RefreshTokenSchemaType } from "@/validators";
import * as HttpStatus from "http-status";

export const logoutHandler = catchAsync(async (c) => {
  const { refreshToken }: RefreshTokenSchemaType = await c.get("validatedData").body;

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
