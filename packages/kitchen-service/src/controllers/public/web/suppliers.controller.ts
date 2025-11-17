import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/services/repositories/suppliers.service";
import { CreateSupplierSchemaType, ItemsQuerySchemaType } from "@/validator/supplier.validator";


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


export const listSuppliersHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ItemsQuerySchemaType;

  const page = parseInt(String(query.page || 1));
  const limit = parseInt(String(query.limit || 10));
  const search = query.search;
  const audit = getAuditFields(c);

  console.log(audit.kitchenId, '-----audit.kitchenId-----');

  const data = await getSuppliers({
    kitchenIds: audit.kitchenId,
    limit,
    page,
    search
  });

  return c.json({ ...data }, 200);
});

export const getSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await getSupplierById(id);
  return c.json({ data }, 200);
});

export const createSupplierHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateSupplierSchemaType;
  const audit = getAuditFields(c);

  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const data = await createSupplier({
    ...body,
    kitchenId: body.kitchenId || "",
    createdBy: audit.createdBy,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    updatedBy: audit.updatedBy
  }, foodIdArray);
  return c.json({ data }, 201);
});

export const updateSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const data = await updateSupplier(id, body, foodIdArray);
  return c.json({ data }, 200);
});

export const deleteSupplierHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await deleteSupplier(id);
  return c.json({ data }, 200);
});
