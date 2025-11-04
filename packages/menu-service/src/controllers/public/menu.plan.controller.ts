import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListMenuPlansQuerySchemaType,
  CreateMenuPlanSchemaType,
  UpdateMenuPlanSchemaType,
  UpdateMenuPlanStatusSchemaType,
  AssignFoodToMenuPlanSchemaType,
  AssignPlanDistributionSchemaType,
  UnassignPlanDistributionQuerySchemaType
} from "@/validator/menu.plan.validator";
import { createMenuPlan, getDistributionByMenuPlanId, getFoodItemsByMenuPlanId, getMenuPlanById, getMenuPlansList, softDeleteMenuPlan, updateMenuPlan, updatePlanStatus } from "@/services/repositories/menu.plan.service";
import { assignFoodToMenuPlan, unassignFoodFromMenuPlan } from "@/services/repositories/menu.food.service";
import { assignPlanDistribution, unassignPlanDistribution } from "@/services/repositories/menu.plan.schools.kitchen.service";

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

export const listMenuPlansHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListMenuPlansQuerySchemaType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const villageId = query.villageId;
  const status = query.status;
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;
  const entityType = query.entityType || null;
  const search = query.search || null;

  const audit = getAuditFields(c);

  const data = await getMenuPlansList({
    page,
    limit,
    villageId,
    status,
    startDate,
    endDate,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.schoolId,
    entityType,
    menuPlanName: search || ''
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createMenuPlanHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateMenuPlanSchemaType;
  const audit = getAuditFields(c);

  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];
  const dateArray = body.dates as unknown as string[] || (body as any)["dates[]"] || [];

  const newPlan = await createMenuPlan({
    ...body,
    createdBy: audit.createdBy,
    planStartDate: body?.planStartDate || new Date().toISOString().split("T")[0],
    planEndDate: body?.planEndDate || new Date().toISOString().split("T")[0],
    status: "ACTIVE"
  }, body.kitchenId, foodIdArray, dateArray);

  return c.json({ data: newPlan, message: "Plan menu created" }, 201);
});

export const getMenuPlanByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const plan = await getMenuPlanById(id, audit.kitchenId);

  return c.json({ data: plan.data }, 200);
});

export const updateMenuPlanHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as UpdateMenuPlanSchemaType;
  const audit = getAuditFields(c);
  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const updatedPlan = await updateMenuPlan(id, {
    ...body,
    updatedBy: audit.updatedBy,
    planStartDate: body?.planStartDate,
    planEndDate: body?.planEndDate,
  }, body.kitchenId, foodIdArray, audit.updatedBy);

  return c.json({ data: updatedPlan, message: "Plan menu updated" }, 200);
});

export const deleteMenuPlanHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  await softDeleteMenuPlan(id, audit.updatedBy);

  return c.json({ message: "Plan menu deleted" }, 200);
});

export const updateMenuPlanStatusHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { status } = await c.req.parseBody() as unknown as UpdateMenuPlanStatusSchemaType;
  const audit = getAuditFields(c);

  const updatedPlan = await updatePlanStatus(id, status, audit.updatedBy);

  return c.json({ data: updatedPlan, message: `Status plan updated ${status}.` }, 200);
});

export const listFoodItemsInPlanHandler = catchAsync(async (c: Context) => {
  const { id: menuFoodPlanId } = c.req.param();

  const data = await getFoodItemsByMenuPlanId(menuFoodPlanId);

  return c.json({ data }, 200);
});

export const assignFoodToMenuPlanHandler = catchAsync(async (c: Context) => {
  const { id: menuFoodPlanId } = c.req.param();
  const { foodItemId } = await c.req.parseBody() as unknown as AssignFoodToMenuPlanSchemaType;
  const audit = getAuditFields(c);

  const newAssignment = await assignFoodToMenuPlan({
    menuFoodPlanId,
    foodItemId,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newAssignment, message: "Food item added to plan menu" }, 201);
});

export const unassignFoodFromMenuPlanHandler = catchAsync(async (c: Context) => {
  const { id: menuFoodPlanId, foodItemId } = c.req.param();

  await unassignFoodFromMenuPlan(foodItemId, menuFoodPlanId);

  return c.json({ message: "Food item removed from plan menu" }, 200);
});

export const listPlanDistributionHandler = catchAsync(async (c: Context) => {
  const { id: menuPlanId } = c.req.param();

  const data = await getDistributionByMenuPlanId(menuPlanId);

  return c.json({ data }, 200);
});

export const assignPlanDistributionHandler = catchAsync(async (c: Context) => {
  const { id: menuPlanId } = c.req.param();
  const { schoolId, kitchenId } = await c.req.parseBody() as unknown as AssignPlanDistributionSchemaType;
  const audit = getAuditFields(c);

  const newDistribution = await assignPlanDistribution({
    menuPlanId,
    schoolId,
    kitchenId,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newDistribution, message: "Plan distributed to school" }, 201);
});

export const unassignPlanDistributionHandler = catchAsync(async (c: Context) => {
  const { id: menuPlanId } = c.req.param();
  const { schoolId, kitchenId } = c.req.query() as unknown as UnassignPlanDistributionQuerySchemaType;

  await unassignPlanDistribution(menuPlanId, schoolId, kitchenId);

  return c.json({ message: "Remove plan from school ." }, 200);
});