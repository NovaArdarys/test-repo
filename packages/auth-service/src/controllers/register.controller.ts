import { createUserServiceClient } from "@/services/clients/user.service";
import { catchAsync } from "@/utils/catchAsync";
import { RegisterSchemaType } from "@/validator/auth.validator";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

export const registerHandler = catchAsync(async (c) => {

  const { email, password, address, dateOfBirth, fullName, phoneNumber, roleId, isActive, domainId }: RegisterSchemaType = await c.get("validatedData").body;
  const audit = getAuditFields(c);
  console.log({ email, password, address, dateOfBirth, fullName, phoneNumber, roleId, isActive, domainId }, "====ok=====");


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
  });

  return c.json({ data: result });
});