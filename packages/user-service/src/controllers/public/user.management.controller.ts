import { Context } from 'hono';
import * as UserService from '@/services/repositories/user.detail.service';
import * as AuthManagementService from '@/services/repositories/role.permission.service';
import {
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserDetailInput
} from "@/db/schemas";
import { catchAsync } from '@/utils/catchAsync';

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

// ----- user -----
export const listUsersHandler = catchAsync(async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const isActive = query.is_active !== undefined ? query.is_active === 'true' : undefined;
  const name = query.name;

  const result = await UserService.getUsersList({
    page,
    limit,
    isActive,
    name,
    email: name
  });
  return c.json({ data: result.data, meta: result.meta }, 200);
});

export const getUserProfile = catchAsync(async (c) => {

  const audit = getAuditFields(c);
  const user = await UserService.getUserById(audit.userId);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ data: user }, 200);
});

export const createUserHandler = catchAsync(async (c) => {
  const data = await c.req.parseBody() as unknown as CreateUserInput;
  const audit = getAuditFields(c);

  const newUser = await UserService.createUser({
    ...data,
    created_by: audit.createdBy,
  });
  return c.json({ message: 'User created successfully', data: newUser }, 201);
});

export const getUserByIdHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const user = await UserService.getUserById(id);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ data: user }, 200);
});

export const updateUserHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const data = await c.req.parseBody() as unknown as UpdateUserInput;
  const audit = getAuditFields(c);

  const result = await UserService.updateUser(id, { ...data, updated_by: audit.updatedBy });
  return c.json({ message: 'User updated successfully', data: { ...result, ...data } }, 200);
});

export const deleteUserHandler = catchAsync(async (c) => {
  const id = c.req.param('id');
  const audit = getAuditFields(c);

  const result = await UserService.deleteUser(id, audit.updatedBy);
  return c.json({ message: 'User soft deleted successfully', data: { id: result.id } }, 200);
});


// --- user detail ---
export const getUserDetailsHandler = catchAsync(async (c) => {
  const userId = c.req.param('id');
  const details = await UserService.getUserDetails(userId);

  if (!details) {
    return c.json({ error: 'User details not found' }, 404);
  }
  return c.json({ data: details }, 200);
});


export const updateUserDetailsHandler = catchAsync(async (c) => {
  const data = await c.req.parseBody() as unknown as UpdateUserDetailInput;
  const audit = getAuditFields(c);

  const user = await UserService.updateUser(audit.userId, { ...data, updated_by: audit.updatedBy });
  const profile = await UserService.getUserById(audit.userId);

  if (profile) {
    const result = await UserService.updateOrCreateUserDetails(profile?.id, { ...data, updated_by: audit.updatedBy, created_by: audit.createdBy, });

    if (!result) {
      return c.json({ error: 'Failed to update or create user details' }, 500);
    }
  }

  return c.json({ message: 'User details updated successfully', data: { id: user.id } }, 200);
});
