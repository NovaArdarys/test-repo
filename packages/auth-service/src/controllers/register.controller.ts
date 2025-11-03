import { createUserServiceClient } from "@/services/clients/user.service";
import { catchAsync } from "@/utils/catchAsync";
import { registerSchemaType } from "@/validator/auth.validator";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  updatedAt: new Date(),
  createdAt: new Date()
});

export const registerHandler = catchAsync(async (c) => {

  const { email, password, address, dateOfBirth, fullName, phoneNumber, roleId, isActive, kitchenId, schoolId } = await c.req.parseBody() as unknown as registerSchemaType;
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
    kitchenId: kitchenId ?? "",
    schoolId: schoolId ?? "",
    createdBy: audit.createdBy,
    updatedAt: new Date(),
  });

  return c.json({ data: result });
});