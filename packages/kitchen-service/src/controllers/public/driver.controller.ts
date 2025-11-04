import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { createDriver, getDriverById, getDriverByUserId, getDriversList, softDeleteDriver, updateDriver } from "@/services/repositories/driver.service";
import { CreateDriverSchemaType } from "@/validator/driver.validator";

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

export const listDriversHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const kitchenId = query.kitchenId;
  const is_active = query.isActive;
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');

  const isActive = is_active !== undefined ? Boolean(is_active) : undefined;

  const data = await getDriversList({
    page,
    limit,
    isActive,
    kitchenId,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});


export const createDriverHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateDriverSchemaType;
  const audit = getAuditFields(c);

  const existingDriver = await getDriverByUserId(body.userId);
  if (existingDriver) {
    throw new ApiError(409, { message: "User Alredy Assign as driver" });
  }

  const newDriver = await createDriver({
    ...body,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newDriver, message: "Driver berhasil ditugaskan." }, 201);
});


export const getDriverByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const driver = await getDriverById(id);

  if (!driver) {
    throw new ApiError(404, { message: "Driver not found" });
  }

  return c.json({ data: driver }, 200);
});


export const updateDriverHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody();
  const audit = getAuditFields(c);

  const updatedDriver = await updateDriver(id, {
    ...body,
    updatedBy: audit.updatedBy,
  });

  if (!updatedDriver) {
    throw new ApiError(404, { message: "Driver not found or failed to update" });
  }

  return c.json({ data: updatedDriver, message: "Data driver berhasil diperbarui." }, 200);
});


export const deleteDriverHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deletedDriver = await softDeleteDriver(id, audit.updatedBy);

  if (!deletedDriver) {
    throw new ApiError(404, { message: "Driver not found" });
  }

  return c.json({ message: "Driver Deleted" }, 200);
});