import { ForgotPasswordSchemaType, ResetPasswordSchemaType } from "../validators";
import { catchAsync } from "../utils/catchAsync";
import ApiError from "@/utils/ApiError";
import { isEmpty } from "lodash";
import * as HttpStatus from "http-status";
import { getUserInfoServiceClient, updateUserPasswordServiceClient } from "@/services/clients/user.service";
import * as process from "process";
import { generateResetToken, verifyResetToken } from "@/utils/jwt";
import { emailQueue } from "@/jobs/queue/email.queue";

export const forgotPasswordHandler = catchAsync(async (c) => {
  const { username }: ForgotPasswordSchemaType = await c.get("validatedData").body;

  const findUser = await getUserInfoServiceClient({ username });

  if (isEmpty(findUser)) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: "user tidak ditemukkan" });
  }

  const resetToken = await generateResetToken({ email: findUser.email, id: findUser.id });
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

  const res = await emailQueue.add(
    "send-email", {
    type: "forgot-password",
    to: findUser.email,
    data: {
      resetLink: resetLink
    },
  },
    {
      // jobId: `email-forgot-password-${findUser.email}-${Date.now()}`
      // jobId: `email:forgot-password:${findUser.email}:${Date.now()}`
    }
  );


  return c.json({
    status: "success",
    message: "Reset password email has been sent",
  });
});


export const resetPasswordHandler = catchAsync(async (c) => {
  const { token, password, confirmPassword }: ResetPasswordSchemaType = c.get('validatedData')?.body;

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