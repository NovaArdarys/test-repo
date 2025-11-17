import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import {
  createBeneficiary,
  getBeneficiaryById,
  getBeneficiaryList,
  softDeleteBeneficiary,
  updateBeneficiary,
  assignUserToBeneficiary,
  unassignUserFromBeneficiary,
  isUserAssignedToBeneficiary,
  syncUserBeneficiaryByMerge
} from "@/services/repositories/beneficiary.service";
import { CreateBeneficiarySchemaType, AssignUserToBeneficiarySchemaType } from "@/validator/beneficiary.validator";
import { isEmpty } from "lodash";

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

export const listBeneficiaryHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const name = query.name;
  const kitchenId = query.kitchenId;
  const neLat = query.neLat;
  const neLng = query.neLng;
  const swLat = query.swLat;
  const swLng = query.swLng;

  const data = await getBeneficiaryList({
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

export const createBeneficiaryHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData").body ?? {};
  const audit = getAuditFields(c);

  const newSchool = await createBeneficiary({
    ...body as CreateBeneficiarySchemaType,
    joinedDate: new Date(body.joinedDate),
    lon: String(body.lon),
    lat: String(body.lat),
    createdBy: audit.createdBy,
  });

  const usersArray = body.users as unknown as string[] || body["users[]"] || [];

  console.log(console.log(usersArray), body, "===== ok ======");

  if (!isEmpty(usersArray)) {
    await syncUserBeneficiaryByMerge({ beneficiaryId: newSchool.id, userId: audit.createdBy, userIds: usersArray });
  }

  return c.json({ data: newSchool, message: "School Created" }, 201);
});

export const getBeneficiaryByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const school = await getBeneficiaryById(id);

  if (!school) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  return c.json({ data: school }, 200);
});

export const updateBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.get("validatedData").body ?? {} as unknown as CreateBeneficiarySchemaType;
  const audit = getAuditFields(c);

  const existingData = await getBeneficiaryById(id);
  if (!existingData) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  const updatedData = await updateBeneficiary(id, {
    ...body,
    joinedDate: new Date(body.joinedDate),
    lon: String(body.lon),
    lat: String(body.lat),
    updatedBy: audit.updatedBy,
  });

  if (!updatedData) {
    throw new ApiError(500, { message: "Failed Update School" });
  }

  const usersArray = body.users as unknown as string[] || body["users[]"] || [];

  if (!isEmpty(usersArray)) {
    await syncUserBeneficiaryByMerge({ beneficiaryId: updatedData.id, userId: audit.createdBy, userIds: usersArray });
  }
  return c.json({ data: updatedData, message: "Updated School" }, 200);
});

export const deleteBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deletedBeneficiary = await softDeleteBeneficiary(id, audit.updatedBy);

  if (!deletedBeneficiary) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  return c.json({ message: "Sekolah berhasil dihapus." }, 200);
});
export const assignUserToBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id: beneficiaryId } = c.req.param();
  const { userId } = await c.get("validatedData").body ?? {} as unknown as AssignUserToBeneficiarySchemaType;
  const audit = getAuditFields(c);

  const school = await getBeneficiaryById(beneficiaryId);
  if (!school) {
    throw new ApiError(404, { message: "School Not Found" });
  }

  const alreadyAssigned = await isUserAssignedToBeneficiary(userId, beneficiaryId);
  if (alreadyAssigned) {
    throw new ApiError(409, { message: "Failed Assign To School" });
  }

  await assignUserToBeneficiary({
    beneficiaryId: beneficiaryId,
    userId: userId,
    createdBy: audit.createdBy,
  });

  return c.json({ message: "User Assigned To School" }, 201);
});

export const unassignUserFromBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id: beneficiaryId, userId } = c.req.param();

  const isAssigned = await isUserAssignedToBeneficiary(userId, beneficiaryId);
  if (!isAssigned) {
    throw new ApiError(404, { message: "Assigned Not Found" });
  }

  await unassignUserFromBeneficiary(userId, beneficiaryId);

  return c.json({ message: "User Unassigned From School" }, 200);
});