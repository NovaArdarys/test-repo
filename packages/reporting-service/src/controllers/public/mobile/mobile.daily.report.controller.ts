// src/controllers/dailyReport.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getDailyReportsList,
  getDailyReportById,
} from "@/services/repositories/mobile/daily.report.service";
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
    schoolIds: audit.schoolId,
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
