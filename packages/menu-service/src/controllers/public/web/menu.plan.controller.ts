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
import { getDistributionByMenuPlanId, getFoodItemsByMenuPlanId, getMenuPlanById, getMenuPlansList, softDeleteMenuPlan, updatePlanStatus } from "@/services/repositories/menu.plan.service";
import { assignFoodToMenuPlan, unassignFoodFromMenuPlan } from "@/services/repositories/menu.food.service";
import { assignPlanDistribution, unassignPlanDistribution } from "@/services/repositories/menu.plan.schools.kitchen.service";
import { isEmpty } from "lodash";
import { menuPlanQueue } from "@/jobs/queue/menuplan.queue";
import { getPriorityByDate } from "@/utils/jobPriority";
import { getActiveDriversByKitchen } from "@/services/repositories/web/driver.service";

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

export const listMenuPlansHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListMenuPlansQuerySchemaType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const status = query.status;
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;
  const entityType = query.entityType || null;
  const search = query.search || null;

  const audit = getAuditFields(c);

  const data = await getMenuPlansList({
    page,
    limit,
    villageId: "",
    status,
    startDate,
    endDate,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.beneficiaryId,
    entityType,
    menuPlanName: search || ''
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createMenuPlanHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateMenuPlanSchemaType;
  const audit = getAuditFields(c);

  const foodIdArray = body.foodIds as string[] || (body as any)["foodIds[]"] || [];
  const dateArray = body.dates as string[] || (body as any)["dates[]"] || [];

  const kitchenId = !isEmpty(body?.kitchenId) ? body.kitchenId : audit.kitchenId?.[0] || null;

  if (!kitchenId) {
    return c.json({ message: "kitchenId dibutuhkan" }, 400);
  }

  const activeDrivers = await getActiveDriversByKitchen(audit.kitchenId);
  if (activeDrivers.length < 2) {
    return c.json(
      { message: "Minimal 2 pengemudi aktif dibutuhkan untuk membuat plan" },
      400
    );
  }

  const jobIds: string[] = [];

  for (const date of dateArray) {
    const jobId = `${kitchenId}-${date}`;

    await menuPlanQueue.add(
      "menuplan-create",
      {
        type: "create",
        data: {
          ...body,
          kitchenId,
          createdBy: audit.createdBy,
          planStartDate: date,
          planEndDate: date,
          status: "ACTIVE"
        },
        kitchenId,
        foodItemsIds: foodIdArray,
        dates: date
      },
      {
        jobId,
        priority: getPriorityByDate(date),
        removeOnComplete: { age: 3600 * 24 * 7 },
        removeOnFail: { age: 3600 * 24 * 7 }
      }
    );

    jobIds.push(jobId);
  }

  // Response cepat sekali
  return c.json(
    {
      message: `Pembuatan menu plan untuk ${dateArray.length} tanggal telah dimulai`,
      jobIds,           // kembalikan ke FE
      kitchenId,
      dates: dateArray
    },
    202 // Accepted — proses asynchronous
  );
});

export const getMenuPlanByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  const plan = await getMenuPlanById(id, audit.kitchenId);

  return c.json({ data: plan.data }, 200);
});

export const updateMenuPlanHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await await c.req.parseBody() as unknown as UpdateMenuPlanSchemaType;
  const audit = getAuditFields(c);
  const foodIdArray = body.foodIds as unknown as string[] || (body as any)["foodIds[]"] || [];

  const activeDrivers = await getActiveDriversByKitchen(audit.kitchenId);

  if (activeDrivers.length < 2) {
    return c.json(
      {
        message: "Tidak dapat membuat rencana menu. Pastikan terdapat minimal 2 pengemudi aktif dengan kapasitas porsi lebih dari 0.",
      },
      400
    );
  }

  await menuPlanQueue.add(
    "menuplan-update",
    {
      type: "update",
      menuPlanId: id,
      data: {
        ...body,
        kitchenId: !isEmpty(body?.kitchenId) ? body?.kitchenId : audit.kitchenId?.[0] || null,
        updatedBy: audit.updatedBy,
        planStartDate: body.planStartDate,
        planEndDate: body.planEndDate,
      },
      kitchenId: !isEmpty(body?.kitchenId) ? body?.kitchenId : audit.kitchenId?.[0],
      foodItemsIds: foodIdArray,
      updatedBy: audit.updatedBy,
      dates: body.planStartDate || new Date().toISOString().split("T")[0],
    },
    {
      priority: getPriorityByDate(body.planStartDate || new Date().toISOString().split("T")[0]),
      removeOnComplete: true,
      attempts: 3
    }
  );


  return c.json({ data: body, message: "Plan menu updated" }, 200);
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
  const { beneficiaryId } = await c.req.parseBody() as unknown as AssignPlanDistributionSchemaType;
  const audit = getAuditFields(c);

  const newDistribution = await assignPlanDistribution({
    menuPlanId,
    beneficiaryId,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newDistribution, message: "Plan distributed to school" }, 201);
});

export const unassignPlanDistributionHandler = catchAsync(async (c: Context) => {
  const { id: menuPlanId } = c.req.param();
  const { beneficiaryId } = c.req.query() as unknown as UnassignPlanDistributionQuerySchemaType;

  await unassignPlanDistribution(menuPlanId, beneficiaryId);

  return c.json({ message: "Remove plan from school ." }, 200);
});