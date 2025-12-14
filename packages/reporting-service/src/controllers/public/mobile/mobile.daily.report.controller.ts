// src/controllers/dailyReport.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getDailyReportsList,
  getDailyReportById,
  updateStepReport,
  getDailyReportWithoutMaskById,
} from "@/services/repositories/daily.report.service";
import { publishStepUpdate } from "@/messaging/publishers/reporting.publisher";
import { every, isEmpty } from "lodash";
import { getDriverDeliveries } from "@/services/repositories/daily.report.driver.service";
import { getDailyReportsListSPPG } from "@/services/repositories/daily.report.sppg.service";

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



export const listDailyReportsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const audit = getAuditFields(c);
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const search = query.search || '';
  const typeOfReport = query.typeOfReport || '';

  const { view, entity } = await c.get("validatedData").param;

  if (entity === "driver") {
    const data = await getDriverDeliveries({
      driverId: audit.driverId?.[0],
      startDate: query.startDate,
      endDate: query.endDate,
      page,
      limit,
      view
    });

    return c.json(data);
  }

  if (entity === "sppg") {
    const data = await getDailyReportsListSPPG({
      entityType: "kitchen",
      entityId: query.entityId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      kitchenIds: audit.kitchenId,
      schoolIds: audit.beneficiaryId,
      driversIds: audit.driverId,
      page,
      limit,
      menuPlanName: search,
      view,
      typeOfReport: typeOfReport as any
    });

    return c.json(data);
  }

  const entityId = audit.domain === "kitchen" ? !isEmpty(audit.driverId) ? audit.driverId?.[0] ?? null : audit.kitchenId?.[0] ?? null : audit.domain === "beneficiary" ? audit.beneficiaryId?.[0] ?? null : null;

  if (isEmpty(entityId)) {
    return c.json({ message: "User belum punya lokasi penempatan" }, 400);
  }

  const data = await getDailyReportsList({
    entityType: entity,
    entityId: query.entityId,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    kitchenIds: audit.kitchenId ?? [entityId],
    schoolIds: audit.beneficiaryId,
    driversIds: audit.driverId,
    page,
    limit,
    menuPlanName: search,
    view,
    subDomains: audit.subDomain
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
    console.log({
      id,
      menuPlanId: report.menuPlan.id,
      allStepCompleted: allCompleted,
      entityId: report.entityId,
      entityType: report.entityType,
    }, "=====allCompleted=====");

    await publishStepUpdate({
      id,
      menuPlanId: report.menuPlan.id,
      allStepCompleted: allCompleted,
      entityId: report.entityId,
      entityType: report.entityType,
    });
  }

  return c.json({ data: updated });
});