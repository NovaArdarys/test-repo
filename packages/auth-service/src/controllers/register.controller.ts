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

  const { email, password, address, dateOfBirth, fullName, phoneNumber, roleId, file } = await c.req.parseBody() as unknown as registerSchemaType;
  const audit = getAuditFields(c);

  // if (file) {
  //   if (Array.isArray(file)) {
  //     file.forEach(f => console.log("Multiple:", f.name));
  //   } else {
  //     console.log("Single:", file.name);
  //     return c.json({ data: file.name });
  //   }
  // }

  const [firstName, lastName] = fullName?.split(" ") || ["", ""];
  const { password: resPassword, ...result } = await createUserServiceClient({
    email,
    password,
    address: address || "",
    dateOfBirth: dateOfBirth || new Date(),
    firstName: firstName || "",
    lastName: lastName || "",
    phoneNumber: phoneNumber || "",
    updatedAt: new Date(),
    createdBy: audit.createdBy,
    roleId
  });

  return c.json({ data: result });
});