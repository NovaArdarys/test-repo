import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListMenuPlansQuerySchemaType
} from "@/validator/mobile/menu.plan.validator";
import { getMenuPlanById, getMenuPlansList } from "@/services/repositories/mobile/menu.plan.service";

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
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});



export const listMenuPlansHandler = catchAsync(async (c: Context) => {
  const query = c.get("validatedData").query as unknown as ListMenuPlansQuerySchemaType;
  const param = c.get("validatedData").param;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;
  const entityType = param.entityType || null;
  const search = query.search || null;

  const audit = getAuditFields(c);

  const data = await getMenuPlansList({
    page,
    limit,
    startDate,
    endDate,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.schoolId,
    entityType,
    menuPlanName: search || ''
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const getMenuPlanByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const plan = await getMenuPlanById(id);

  return c.json({ data: plan.data }, 200);
});