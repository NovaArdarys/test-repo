import { refreshTokenSchemaType, registerSchemaType, SaveTokenType, UserInfoShemaType } from "../../validator/user.validator";
import ApiError from "../../utils/ApiError";
import { catchAsync } from "../../utils/catchAsync";
import { isEmpty } from "lodash";
import * as HttpStatus from "http-status";
import { createUser, getUser, revokeTokenStatus, saveRefreshToken, updateUser, validateTokenStatus } from "@/services/repositories/user.service";
import { publishAssignProfileDriver, publishAssignUserToKitchen, publishAssignUserToBeneficiary } from "@/messaging/publishers/user.publisher";
import { getRoleById } from "@/services/repositories/role.permission.service";

export const userInfoHandler = catchAsync(async (c) => {
  const { username }: UserInfoShemaType = await c.req.parseBody();

  const findUser = await getUser({ email: username, phone: username });

  if (isEmpty(findUser)) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: "Unauthorized" });
  }


  return c.json({
    data: findUser,
  });
});

export const userSaveTokenHandler = catchAsync(async (c) => {
  const { expiresAt, token, userId, deviceInfo, ipAddress }: SaveTokenType = await c.req.parseBody() as unknown as SaveTokenType;


  const result = await saveRefreshToken(userId, token, expiresAt, deviceInfo, ipAddress);

  return c.json({
    data: result,
  });
});


export const registerHandler = catchAsync(async (c) => {

  const { email, password, address, dateOfBirth, firstName, lastName, phoneNumber, roleId, isActive, domainId, createdBy } = await c.req.parseBody() as unknown as registerSchemaType;

  const result = await createUser({
    email,
    password,
    createdBy: createdBy || null,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    isActive
  }, {
    address: address || "",
    dateOfBirth: dateOfBirth || new Date(),
    firstName: firstName || "",
    lastName: lastName || "",
    phoneNumber: phoneNumber || "",
  }, roleId || "");

  if (roleId) {

    const role = await getRoleById(roleId);

    if (role?.domain === "kitchen" && domainId) {
      await publishAssignUserToKitchen({
        kitchenId: domainId,
        userId: result.userId,
        createdBy: createdBy || ""
      });
    }

    if (role?.domain === "beneficiary" && domainId) {
      await publishAssignUserToBeneficiary({
        beneficiaryId: domainId,
        userId: result.userId,
        createdBy: createdBy || ""
      });
    }

    if (role?.domain === "driver" && domainId) {
      await publishAssignProfileDriver({
        kitchenId: domainId,
        userId: result.userId,
        createdBy: createdBy || ""
      });
    }

    return c.json({ data: { ...result, [role?.domain || "domainId"]: domainId } });
  }

  return c.json({ data: { ...result } });

});

export const removeTokenHandler = catchAsync(async (c) => {

  const { refreshToken, isDeleted }: refreshTokenSchemaType = await c.req.parseBody() as unknown as refreshTokenSchemaType;

  const result = await revokeTokenStatus(refreshToken, isDeleted);

  return c.json({ data: result });
});

export const validateTokenHandler = catchAsync(async (c) => {

  const { refreshToken }: refreshTokenSchemaType = await c.req.parseBody() as unknown as refreshTokenSchemaType;

  const result = await validateTokenStatus(refreshToken);

  return c.json({ data: result });
});

export const updatePasswordUserHandler = catchAsync(async (c) => {
  try {
    const data = await c.req.parseBody() as any;

    const result = await updateUser(data.id, { ...data, updated_by: data.id });
    return c.json({ message: 'User updated successfully', data: { ...result, ...data } }, 200);
  } catch (error) {
    if (error instanceof ApiError) return c.json({ error: error.message }, error.statusCode);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});