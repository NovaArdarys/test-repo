import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import {
  createBeneficiaryPortions,
  getBeneficiaryPortionsById,
  getBeneficiaryPortionsList,
  updateBeneficiaryPortions,
  softDeleteBeneficiaryPortions,
  bulkUpdateTotalStudents
} from "@/services/repositories/beneficiary.portions.service";
import {
  CreateBeneficiaryPortionsSchemaType,
  BulkUpdateTotalBeneficiarySchemaType
} from "@/validator/beneficiary.portions.validator";
import { publishClientCommitStorage } from "@/messaging/publishers/school.publisher";

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



export const listBeneficiaryPortionsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const name = query.name;
  const startDate = query.startDate;
  const endDate = query.endDate;
  const portionType = query.portionType
    ? query.portionType : undefined;

  const audit = getAuditFields(c);

  const data = await getBeneficiaryPortionsList({
    page,
    limit,
    name,
    schoolIds: audit.beneficiaryId,
    portionType,
    endDate,
    startDate
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createBeneficiaryPortionsHandler = catchAsync(async (c: Context) => {
  const body = (c.get('validatedData')?.body) as unknown as CreateBeneficiaryPortionsSchemaType;
  const audit = getAuditFields(c);

  const newClassroom = await createBeneficiaryPortions({
    ...body,
    createdBy: audit.createdBy,
  });

  await publishClientCommitStorage({ entityId: newClassroom.id, storageId: newClassroom.storageId || "" });

  return c.json({ data: newClassroom, message: "Classroom Created" }, 201);
});

export const getBeneficiaryPortionsByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const classroom = await getBeneficiaryPortionsById(id);

  if (!classroom) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  return c.json({ data: classroom }, 200);
});

export const updateBeneficiaryPortionsHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = (c.get('validatedData')?.body) as unknown as CreateBeneficiaryPortionsSchemaType;
  const audit = getAuditFields(c);

  const existing = await getBeneficiaryPortionsById(id);
  if (!existing) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  const updated = await updateBeneficiaryPortions(id, {
    ...body,
    updatedBy: audit.updatedBy,
  });

  if (!updated) {
    throw new ApiError(500, { message: "Failed Update Classroom" });
  }
  await publishClientCommitStorage({ entityId: updated.id, storageId: updated.storageId || "" });


  return c.json({ data: updated, message: "Updated Classroom" }, 200);
});

export const deleteBeneficiaryPortionsHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deleted = await softDeleteBeneficiaryPortions(id, audit.updatedBy);

  if (!deleted) {
    throw new ApiError(404, { message: "Classroom Not Found" });
  }

  return c.json({ message: "Classroom deleted successfully." }, 200);
});

export const bulkUpdateTotalStudentsHandler = catchAsync(async (c: Context) => {
  const body = (c.get('validatedData')?.body) as unknown as BulkUpdateTotalBeneficiarySchemaType;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ApiError(400, { message: "No update items provided." });
  }

  const updated = await bulkUpdateTotalStudents(body.items);

  return c.json({ data: updated, message: "Bulk Update Successful" }, 200);
});
