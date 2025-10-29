import { ForgotPasswordSchemaType, ResetPasswordSchemaType } from "../validator/auth.validator";
import { catchAsync } from "../utils/catchAsync";
import ApiError from "@/utils/ApiError";
import { isEmpty } from "lodash";
import * as HttpStatus from "http-status";
import { getUserInfoServiceClient, updateUserPasswordServiceClient } from "@/services/clients/user.service";
import { sendEmail } from "@/services/repositories/email.service";
import * as process from "process";
import { generateResetToken, verifyResetToken } from "@/utils/jwt";

export const forgotPasswordHandler = catchAsync(async (c) => {
  const { username }: ForgotPasswordSchemaType = await c.req.parseBody();

  const findUser = await getUserInfoServiceClient({ username });

  if (isEmpty(findUser)) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Unauthorized" });
  }

  const resetToken = await generateResetToken({ email: findUser.email, id: findUser.id });
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

  await sendEmail("reset-password", findUser.email, { resetLink });

  return c.json({
    status: "success",
    message: "Reset password email has been sent",
  });
});


export const resetPasswordHandler = catchAsync(async (c) => {
  const { token, password, confirmPassword }: ResetPasswordSchemaType = await c.req.parseBody();

  if (password !== confirmPassword) {
    throw new ApiError(HttpStatus.default.BAD_REQUEST, { message: "Password and confirmation do not match" });
  }

  let payload;
  try {
    payload = await verifyResetToken(token);
  } catch (err) {
    throw new ApiError(HttpStatus.default.UNAUTHORIZED, { message: "Invalid or expired reset token" });
  }

  const result = await updateUserPasswordServiceClient({ id: (payload as any)?.id || '', password });
  if (isEmpty(result)) {
    throw new ApiError(HttpStatus.default.INTERNAL_SERVER_ERROR, { message: "Failed to update password" });
  }

  return c.json({
    status: "success",
    message: "Password has been successfully reset",
  });
});