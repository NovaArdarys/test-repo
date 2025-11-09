// src/controllers/dailyReport.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getDailyReportsList,
  getDailyReportById,
  updateStepReport,
  getDailyReportWithoutMaskById,
} from "@/services/repositories/daily.report.service";
import { CreateDailyReportSchemaType, CreateStepReportSchemaType, UpdateDailyReportSchemaType } from "@/validator/daily.report.validator";
import { publishStepUpdate } from "@/messaging/publishers/reporting.publisher";
import { every } from "lodash";
import { getDriverDeliveries } from "@/services/repositories/daily.report.driver.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

export const listDailyReportsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const audit = getAuditFields(c);
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const search = query.search || '';

  const { view, entity } = await c.get("validatedData").param;

  if (entity === "driver") {
    const data = await getDriverDeliveries({
      driverId: audit.driverId?.[0],
      startDate: query.startDate,
      endDate: query.endDate,
      page,
      limit,
    });

    return c.json(data);
  }

  const data = await getDailyReportsList({
    entityType: entity,
    entityId: query.entityId,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.schoolId,
    driversIds: audit.driverId,
    page,
    limit,
    menuPlanName: search,
    view
  });
  return c.json(data);
});

export const getDailyReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const report = await getDailyReportById(id);
  if (!report) return c.json({ message: "Not found" }, 404);
  return c.json({ data: report });
});


export const updateStepReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.get("validatedData").body;
  const updated = await updateStepReport(id, { ...body, updatedBy: c.get("userId") });
  const report = await getDailyReportWithoutMaskById(updated.dailyReportId);

  if (report) {
    const allCompleted = every(report.steps, 'isCompleted');
    await publishStepUpdate({
      menuPlanId: report.menuPlan.id,
      allStepCompleted: allCompleted,
      entityId: report.entityId,
      entityType: report.entityType,
    });
  }

  return c.json({ data: updated });
});