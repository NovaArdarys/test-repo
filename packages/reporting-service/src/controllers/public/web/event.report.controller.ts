import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  createEventReport,
  getEventReportById,
  getEventReports,
  updateEventReport,
  softDeleteEventReport,
} from "@/services/repositories/event.report.service";

import {
  CreateEventReportSchemaType,
  UpdateEventReportSchemaType,
  GetEventReportListSchemaType,
} from "@/validator/event.report.validator";
import { publishEventReportCommit } from "@/messaging/publishers/reporting.publisher";

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



export const listEventReportsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as GetEventReportListSchemaType;
  const page = parseInt(String(query.page || "1"));
  const limit = parseInt(String(query.limit || "10"));
  const reportType = query.reportType || undefined;
  const startDate = query.startDate ? query.startDate : undefined;
  const endDate = query.endDate ? query.endDate : undefined;

  const reports = await getEventReports({
    page,
    limit,
    reportType,
    startDate,
    endDate
  });

  return c.json({ data: reports.data, meta: reports.meta }, 200);
});

export const createEventReportHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateEventReportSchemaType;
  const { createdBy } = getAuditFields(c);

  const newReport = await createEventReport({
    ...body,

    date: body.date,
    createdBy,
  });

  if (newReport) {
    await publishEventReportCommit({
      entityId: newReport.id,
      storageIds: body.storageIds,
      entityType: "other"
    });
  }

  return c.json({ data: newReport, message: "Event report created" }, 201);
});

export const getEventReportByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await getEventReportById(id);

  return c.json({ data }, 200);
});

export const updateEventReportHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as UpdateEventReportSchemaType;
  const { updatedBy } = getAuditFields(c);

  const updatedReport = await updateEventReport(id, {
    ...body,
    updatedBy,
  });

  return c.json({ data: updatedReport, message: "Event report updated" }, 200);
});

export const softDeleteEventReportHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { updatedBy } = getAuditFields(c);

  await softDeleteEventReport(id, updatedBy);

  return c.json({ message: "Event report soft deleted" }, 200);
});
