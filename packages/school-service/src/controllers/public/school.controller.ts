import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import {
  createSchool,
  getSchoolById,
  getSchoolsList,
  softDeleteSchool,
  updateSchool,
  assignUserToSchool,
  unassignUserFromSchool,
  isUserAssignedToSchool
} from "@/services/repositories/school.service";
import { CreateSchoolSchemaType, AssignUserToSchoolSchemaType } from "@/validator/school.validator";

const getAuditFields = (c: Context) => ({
  created_by: c.get('userId'),
  updated_by: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

export const listSchoolsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const name = query.name;
  const kitchenId = query.kitchenId;
  const neLat = query.neLat;
  const neLng = query.neLng;
  const swLat = query.swLat;
  const swLng = query.swLng;

  const data = await getSchoolsList({
    page,
    limit,
    name,
    kitchenId,
    neLat,
    neLng,
    swLat,
    swLng,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createSchoolHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateSchoolSchemaType;
  const audit = getAuditFields(c);

  const newSchool = await createSchool({
    ...body,
    lon: String(body.lon),
    lat: String(body.lat),
    createdBy: audit.createdBy,
  });

  return c.json({ data: newSchool, message: "School Created" }, 201);
});

export const getSchoolByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const school = await getSchoolById(id);

  if (!school) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  return c.json({ data: school }, 200);
});

export const updateSchoolHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as CreateSchoolSchemaType;
  const audit = getAuditFields(c);

  const existingSchool = await getSchoolById(id);
  if (!existingSchool) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  const updatedSchool = await updateSchool(id, {
    ...body,
    lon: String(body.lon),
    lat: String(body.lat),
    updatedBy: audit.updatedBy,
  });

  if (!updatedSchool) {
    throw new ApiError(500, { message: "Failed Update School" });
  }

  return c.json({ data: updatedSchool, message: "Updated School" }, 200);
});

export const deleteSchoolHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deletedSchool = await softDeleteSchool(id, audit.updatedBy);

  if (!deletedSchool) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  return c.json({ message: "Sekolah berhasil dihapus." }, 200);
});
export const assignUserToSchoolHandler = catchAsync(async (c: Context) => {
  const { id: schoolId } = c.req.param();
  const { userId } = await c.req.parseBody() as unknown as AssignUserToSchoolSchemaType;
  const audit = getAuditFields(c);

  const school = await getSchoolById(schoolId);
  if (!school) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  const alreadyAssigned = await isUserAssignedToSchool(userId, schoolId);
  if (alreadyAssigned) {
    throw new ApiError(409, { message: "Failed Assign To School" });
  }

  await assignUserToSchool({
    schoolId: schoolId,
    userId: userId,
    createdBy: audit.createdBy,
  });

  return c.json({ message: "User Assigned To School" }, 201);
});

export const unassignUserFromSchoolHandler = catchAsync(async (c: Context) => {
  const { id: schoolId, userId } = c.req.param();

  const isAssigned = await isUserAssignedToSchool(userId, schoolId);
  if (!isAssigned) {
    throw new ApiError(404, { message: "Assigned Not Found" });
  }

  await unassignUserFromSchool(userId, schoolId);

  return c.json({ message: "User Unassigned From School" }, 200);
});