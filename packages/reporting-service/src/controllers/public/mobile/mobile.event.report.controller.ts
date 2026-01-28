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
import { isEmpty } from "lodash";
import { resolveKitchenId } from "@/services/repositories/additional/get.kitchen.by.user.service";
import { resolveEntityId } from "@/utils/resolveEntity";
import { getListUsersByKitchen } from "@/services/repositories/additional/get.user.by.kitchen.service";
import { sendProcessStatusNotification } from "@/utils/notificationHelper";

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



export const listEventReportsHandler = catchAsync(async (c: Context) => {
  const query = await c.get("validatedData").query as GetEventReportListSchemaType;

  const page = parseInt(String(query.page || "1"));
  const limit = parseInt(String(query.limit || "10"));
  const reportType = query.reportType || undefined;
  const startDate = query.startDate ? query.startDate : undefined;
  const endDate = query.endDate ? query.endDate : undefined;

  const { kitchenId, driverId, beneficiaryId, userId, subDomain, domain } = getAuditFields(c);

  const reports = await getEventReports({
    page,
    limit,
    reportType,
    startDate,
    endDate,
    driversIds: driverId ?? [],
    kitchenIds: kitchenId ?? [],
    beneficiaryIds: beneficiaryId ?? [],
    subDomains: subDomain,
    domain: domain
  });

  return c.json({ data: reports.data, meta: reports.meta }, 200);
});

export const createEventReportHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData").body as CreateEventReportSchemaType;
  const { createdBy, domain: actorDomain, driverId, kitchenId, beneficiaryId } = getAuditFields(c);

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

  const newReport = await createEventReport({
    ...body,
    entityType: actorDomain,
    domain: "kitchen",
    domainId: kitchenByUser,
    entityId: entityId,
    reportType: body.reportType ? body.reportType : !isEmpty(driverId) ? "driver" : actorDomain,
    date: body.date,
    createdBy,
  });


  if (newReport) {

    if (actorDomain === "beneficiary") {
      const users = await getListUsersByKitchen({ kitchenId: kitchenByUser, entityTypes: ["kitchen", "driver"] });
      users.forEach((userId) => {
        sendProcessStatusNotification({
          status: "COMPLETED",
          basePayload: {
            entityType: "KITCHEN_REPORT",
            entityId: newReport.id,
            kitchenId: kitchenByUser,
            beneficiaryId: undefined,
            relatedId: undefined,
            relatedType: undefined,
            jobId: undefined,
            date: new Date().toISOString().split("T")[0],
            progress: 100,
            result: newReport,
            error: undefined,
            userActorId: newReport.createdBy,
          },
          config: {
            step: "Berhasil Membuat Menu",
            title: "Laporan Kejadian",
            message: `Laporan ${body.name}`,
          },
          recipientUserIds: [userId],
        });
      });
    } else {
      const users = await getListUsersByKitchen({ kitchenId: kitchenByUser, entityTypes: ["kitchen", "beneficiary"] });
      users.forEach((userId) => {
        sendProcessStatusNotification({
          status: "COMPLETED",
          basePayload: {
            entityType: "KITCHEN_REPORT",
            entityId: newReport.id,
            kitchenId: kitchenByUser,
            beneficiaryId: undefined,
            relatedId: undefined,
            relatedType: undefined,
            jobId: undefined,
            date: new Date().toISOString().split("T")[0],
            progress: 100,
            result: newReport,
            error: undefined,
            userActorId: newReport.createdBy,
          },
          config: {
            step: "Berhasil Membuat Menu",
            title: "Laporan Kejadian",
            message: `Laporan ${body.name}`,
          },
          recipientUserIds: [userId],
        });
      });
    }
  }

  return c.json({ data: newReport, message: "Event report created" }, 201);
});

export const getEventReportByIdHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;
  const data = await getEventReportById(id);

  return c.json({ data }, 200);
});

export const updateEventReportHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;
  const body = await c.get("validatedData").body as unknown as UpdateEventReportSchemaType;
  const { updatedBy, domain, driverId, kitchenId, beneficiaryId } = getAuditFields(c);

  const entityId = resolveEntityId({
    actorDomain: domain,
    kitchenId,
    beneficiaryId,
    driverId,
  });

  const updatedReport = await updateEventReport(id, {
    ...body,
    entityId: entityId,
    reportType: body.reportType ? body.reportType : domain,
    updatedBy,
  });

  return c.json({ data: updatedReport, message: "Event report updated" }, 200);
});

export const softDeleteEventReportHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;
  const { updatedBy, domain, driverId, kitchenId, beneficiaryId } = getAuditFields(c);

  await softDeleteEventReport(id, updatedBy);

  return c.json({ message: "Event report soft deleted" }, 200);
});
