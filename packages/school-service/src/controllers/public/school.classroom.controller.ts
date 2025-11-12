import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import {
  createSchoolClassroom,
  getSchoolClassroomById,
  getSchoolClassroomList,
  updateSchoolClassroom,
  softDeleteSchoolClassroom,
  bulkUpdateTotalStudents
} from "@/services/repositories/school.classroom.service";
import {
  CreateSchoolClassroomSchemaType,
  BulkUpdateTotalStudentSchemaType
} from "@/validator/school.classroom.validator";
import { publishClientCommitStorage } from "@/messaging/publishers/school.publisher";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});


export const listSchoolClassroomHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const name = query.name;
  const startDate = query.startDate;
  const endDate = query.endDate;
  const portionType = query.portionType
    ? query.portionType : undefined;

  const audit = getAuditFields(c);

  const data = await getSchoolClassroomList({
    page,
    limit,
    name,
    schoolIds: audit.schoolId,
    portionType,
    endDate,
    startDate
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createSchoolClassroomHandler = catchAsync(async (c: Context) => {
  const body = (await c.req.parseBody()) as unknown as CreateSchoolClassroomSchemaType;
  const audit = getAuditFields(c);

  const newClassroom = await createSchoolClassroom({
    ...body,
    createdBy: audit.createdBy,
  });

  await publishClientCommitStorage({ entityId: newClassroom.id, storageId: newClassroom.storageId || "" });

  return c.json({ data: newClassroom, message: "Classroom Created" }, 201);
});

export const getSchoolClassroomByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const classroom = await getSchoolClassroomById(id);

  if (!classroom) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  return c.json({ data: classroom }, 200);
});

export const updateSchoolClassroomHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = (await c.req.parseBody()) as unknown as CreateSchoolClassroomSchemaType;
  const audit = getAuditFields(c);

  const existing = await getSchoolClassroomById(id);
  if (!existing) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  const updated = await updateSchoolClassroom(id, {
    ...body,
    updatedBy: audit.updatedBy,
  });

  if (!updated) {
    throw new ApiError(500, { message: "Failed Update Classroom" });
  }
  await publishClientCommitStorage({ entityId: updated.id, storageId: updated.storageId || "" });


  return c.json({ data: updated, message: "Updated Classroom" }, 200);
});

export const deleteSchoolClassroomHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deleted = await softDeleteSchoolClassroom(id, audit.updatedBy);

  if (!deleted) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  return c.json({ message: "Classroom deleted successfully." }, 200);
});

export const bulkUpdateTotalStudentsHandler = catchAsync(async (c: Context) => {
  const body = (await c.req.parseBody()) as unknown as BulkUpdateTotalStudentSchemaType;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ApiError(400, { message: "No update items provided." });
  }

  const updated = await bulkUpdateTotalStudents(body.items);

  return c.json({ data: updated, message: "Bulk Update Successful" }, 200);
});
