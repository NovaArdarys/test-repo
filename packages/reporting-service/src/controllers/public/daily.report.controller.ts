// src/controllers/dailyReport.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  createDailyReport,
  getDailyReportsList,
  getDailyReportById,
  updateDailyReport,
  deleteDailyReport,
  createStepReport,
  getStepReportsByDailyReport,
  updateStepReport,
  deleteStepReport,
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
  domain: c.get('domain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
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

  console.log(audit, "===== audit =====", query);

  if (query.entityType === "driver") {
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
    entityType: query.entityType,
    entityId: query.entityId,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.beneficiaryId,
    driversIds: audit.driverId,
    page,
    limit,
    menuPlanName: search
  });
  return c.json(data);
});

export const getDailyReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const report = await getDailyReportById(id);
  if (!report) return c.json({ message: "Not found" }, 404);
  return c.json({ data: report });
});

export const createDailyReportHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateDailyReportSchemaType;
  const audit = getAuditFields(c);
  const newReport = await createDailyReport({ ...body, ...audit });
  return c.json({ data: newReport }, 201);
});

export const updateDailyReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updated = await updateDailyReport(id, { ...body, updatedBy: c.get("userId") });
  return c.json({ data: updated });
});

export const deleteDailyReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const result = await deleteDailyReport(id);
  return c.json(result);
});

export const listStepReportsHandler = catchAsync(async (c: Context) => {
  const dailyReportId = c.req.param("dailyReportId");
  const steps = await getStepReportsByDailyReport(dailyReportId);
  return c.json({ data: steps });
});

export const createStepReportHandler = catchAsync(async (c: Context) => {
  const dailyReportId = c.req.param("dailyReportId");
  const body = await c.req.parseBody() as unknown as CreateStepReportSchemaType;
  const audit = getAuditFields(c);

  const newStep = await createStepReport({
    ...body,
    ...audit,
    dailyReportId,
  });

  return c.json({ data: newStep }, 201);
});

export const updateStepReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
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

export const deleteStepReportHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const result = await deleteStepReport(id);
  return c.json(result);
});
