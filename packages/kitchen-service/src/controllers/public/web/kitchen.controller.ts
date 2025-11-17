import { Context } from "hono";
import ApiError from "@/utils/ApiError";
import { createKitchen, getKitchenById, getKitchensList, softDeleteKitchen, updateKitchen } from "@/services/repositories/kitchen.service";
import { catchAsync } from "@/utils/catchAsync";
import { assignUserToKitchen, isUserAssignedToKitchen, syncUserKitchenByMerge, unassignUserFromKitchen } from "@/services/repositories/user.kitchen.service";
import { AssignUserToKitchenSchemaType, CreateKitchenSchemaType } from "@/validator/kitchen.validator";
import { updateSchoolServiceClient } from "../../../services/clients/school.service";
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

export const listKitchensHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const name = query.name;
  const neLat = query.neLat;
  const neLng = query.neLng;
  const swLat = query.swLat;
  const swLng = query.swLng;

  const data = await getKitchensList({
    page,
    limit,
    name,
    neLat,
    neLng,
    swLat,
    swLng,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createKitchenHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody();
  const audit = getAuditFields(c);

  const newKitchen = await createKitchen({
    ...body as unknown as CreateKitchenSchemaType,
    lon: String(body.lon),
    lat: String(body.lat),
    createdBy: audit.createdBy,
  });

  const schoolsArray = body.schools as unknown as string[] || body["schools[]"] || [];
  const usersArray = body.users as unknown as string[] || body["users[]"] || [];


  if (!isEmpty(schoolsArray)) {
    await updateSchoolServiceClient({ data: schoolsArray || [], kitchenId: newKitchen.id, userId: audit.updatedBy });
  }
  if (!isEmpty(usersArray)) {
    await syncUserKitchenByMerge({ userId: audit.createdBy, kitchenId: newKitchen.id, userIds: usersArray });
  }

  return c.json({ data: newKitchen, message: "Dapur berhasil dibuat." }, 201);
});


export const getKitchenByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const kitchen = await getKitchenById(id);

  if (!kitchen) {
    throw new ApiError(404, { message: "Kitchen Not Found" });
  }

  return c.json({ data: kitchen }, 200);
});


export const updateKitchenHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody();
  const audit = getAuditFields(c);

  const schoolsArray = body.schools as unknown as string[] || body["schools[]"] || [];
  const usersArray = body.users as unknown as string[] || body["users[]"] || [];

  const updatedKitchen = await updateKitchen(id, {
    ...body,
    updatedBy: audit.updatedBy,
  });

  if (!updatedKitchen) {
    throw new ApiError(404, { message: "Kitchen Not Found" });
  }

  if (!isEmpty(schoolsArray)) {
    await updateSchoolServiceClient({ data: schoolsArray || [], kitchenId: id, userId: audit.updatedBy });
  }

  if (!isEmpty(usersArray)) {
    await syncUserKitchenByMerge({ userId: audit.createdBy, kitchenId: id, userIds: usersArray });
  }


  return c.json({ data: updatedKitchen, message: "Dapur berhasil diperbarui." }, 200);
});


export const deleteKitchenHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const deletedKitchen = await softDeleteKitchen(id, audit.updatedBy);

  if (!deletedKitchen) {
    throw new ApiError(404, { message: "Kitchen Not Found" });
  }

  return c.json({ message: "Dapur berhasil dihapus." }, 200);
});

export const assignUserToKitchenHandler = catchAsync(async (c: Context) => {
  const { id: kitchenId } = c.req.param();
  const { userId } = await c.req.parseBody() as unknown as AssignUserToKitchenSchemaType;

  const alreadyAssigned = await isUserAssignedToKitchen(userId, kitchenId);
  if (alreadyAssigned) {
    throw new ApiError(409, { message: "Failed Assign To Kitchen" });
  }
  const audit = getAuditFields(c);

  await assignUserToKitchen({
    kitchenId,
    userId,
    createdBy: audit.createdBy,
  });

  return c.json({ message: "User Assigned to Kitchen" }, 201);
});


export const unassignUserFromKitchenHandler = catchAsync(async (c: Context) => {
  const { id: kitchenId, userId } = c.req.param();

  const isAssigned = await isUserAssignedToKitchen(userId, kitchenId);
  if (!isAssigned) {
    throw new ApiError(404, { message: "Assigned Not Found" });
  }


  await unassignUserFromKitchen(userId, kitchenId);

  return c.json({ message: "User Unassigned from Kitchen" }, 200);
});