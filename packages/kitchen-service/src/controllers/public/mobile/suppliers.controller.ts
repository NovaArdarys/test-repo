import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/services/repositories/suppliers.service";
import { CreateSupplierSchemaType, ItemsQuerySchemaType } from "@/validator";
import { isEmpty } from "lodash";
import { resolveKitchenId } from "@/services/repositories/additional/get.kitchen.by.user.service";
import { resolveEntityId } from "@/utils/resolveEntity";


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

export const listSuppliersHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ItemsQuerySchemaType;

  const page = parseInt(String(query.page || 1));
  const limit = parseInt(String(query.limit || 10));
  const search = query.search;
  const createdByKitchen = query.createdByKitchen ?? true;
  const audit = getAuditFields(c);

  const data = await getSuppliers({
    kitchenIds: audit.kitchenId,
    limit,
    page,
    search,
    createdByKitchen
  });

  return c.json({ ...data }, 200);
});

export const getSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await getSupplierById(id);
  return c.json({ data }, 200);
});

export const createSupplierHandler = catchAsync(async (c: Context) => {
  const body = c.get('validatedData')?.body as unknown as CreateSupplierSchemaType;
  const { domain: actorDomain, driverId, kitchenId, beneficiaryId, ...audit } = getAuditFields(c);

  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const entityId = resolveEntityId({
    actorDomain,
    kitchenId,
    beneficiaryId,
    driverId,
  });

  if (isEmpty(entityId)) {
    return c.json({ message: "User belum punya lokasi penempatan" }, 400);
  }

  const kitchenByUser = await resolveKitchenId({
    entityType: actorDomain,
    entityId: entityId || "",
  });

  const data = await createSupplier({
    ...body,
    kitchenId: kitchenByUser,
    createdBy: audit.createdBy,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    updatedBy: audit.updatedBy,
  }, foodIdArray);
  return c.json({ data }, 201);
});

export const updateSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = c.get('validatedData')?.body;
  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const data = await updateSupplier(id, body, foodIdArray);
  return c.json({ data }, 200);
});

export const deleteSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await deleteSupplier(id);
  return c.json({ data }, 200);
});
