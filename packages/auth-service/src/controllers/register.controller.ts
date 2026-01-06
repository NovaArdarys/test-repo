import { emailQueue } from "@/jobs/queue/email.queue";
import { createUserServiceClient } from "@/services/clients/user.service";
import { catchAsync } from "@/utils/catchAsync";
import { generateResetToken } from "@/utils/jwt";
import { RegisterSchemaType } from "@/validator/auth.validator";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});

export const registerHandler = catchAsync(async (c) => {

  const { email, password, address, dateOfBirth, fullName, phoneNumber, roleId, isActive, domainId, driverCapacity }: RegisterSchemaType = await c.get("validatedData").body;
  const audit = getAuditFields(c);

  const [firstName, lastName] = fullName?.split(" ") || ["", ""];
  const { password: _removedPassword, ...result } = await createUserServiceClient({
    email,
    password,
    roleId,
    isActive: Boolean(isActive),
    address: address?.trim() ?? "",
    phoneNumber: phoneNumber?.trim() ?? "",
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
    firstName,
    lastName,
    domainId: domainId ?? "",
    createdBy: audit.createdBy,
    updatedAt: new Date(),
    driverCapacity: driverCapacity ?? 0
  });
  const resetToken = await generateResetToken({ email: email, id: result.id });
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

  await emailQueue.add(
    "send-email", {
    type: "forgot-password",
    to: email,
    data: {
      resetLink: resetLink
    },
  },
    {
      jobId: `email:${"forgot-password"}:${email}`
    }
  );

  return c.json({ data: result });
});