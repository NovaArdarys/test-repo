import { publishEventReportCommit } from "@/messaging/publishers/reporting.publisher";
import { resolveKitchenId } from "@/services/repositories/additional/get.kitchen.by.user.service";
import { getListUsersByKitchen } from "@/services/repositories/additional/get.user.by.kitchen.service";
import { createEventReport } from "@/services/repositories/event.report.service";
import { confirmBeneficiaryDelivery, confirmDriverDelivery } from "@/services/repositories/mobile.delivery.confirmation.service";
import { catchAsync } from "@/utils/catchAsync";
import { sendProcessStatusNotification } from "@/utils/notificationHelper";
import { resolveEntityId } from "@/utils/resolveEntity";
import { CreateDeliveryEventReportSchema } from "@/validator/confirm.delivery.validation";
import { Context } from "hono";
import { isEmpty } from "lodash";
import z from "zod";

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


export const createEventReportDeliveryBeneficiaryHandler = catchAsync(async (c) => {
  const deliveryId = c.req.param("id");
  const body = await c.get("validatedData").body as unknown as z.infer<typeof CreateDeliveryEventReportSchema>;
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
    entityId: deliveryId,
    reportType: body?.reportType || "other",
    createdBy,
  });

  await confirmBeneficiaryDelivery(deliveryId, body?.receivedPortion || 0, createdBy);

  if (newReport) {
    await publishEventReportCommit({
      entityId: newReport.id,
      storageIds: body.storageIds,
      entityType: "other"
    });

    if (actorDomain === "beneficiary") {
      const users = await getListUsersByKitchen({ kitchenId: kitchenByUser, entityTypes: ["kitchen", "driver"] });
      if (body.description) {
        users.forEach((userId) => {
          sendProcessStatusNotification({
            status: "COMPLETED",
            basePayload: {
              variant: "warning",
              entityType: "DELIVERY",
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
              userActorId: newReport.updatedBy!,
            },
            config: {
              step: "Pengiriman Diterima",
              title: `${newReport.name}`,
              message: `Pengiriman sudah di terima, ${newReport.description}`,
            },
            recipientUserIds: [userId],
          });
        });
      }
      users.forEach((userId) => {
        sendProcessStatusNotification({
          status: "COMPLETED",
          basePayload: {
            variant: "information",
            entityType: "DELIVERY",
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
            userActorId: newReport.updatedBy!,
          },
          config: {
            step: "Pengiriman Penerima",
            title: "Pengiriman",
            message: `Pengiriman sudah di terima`,
          },
          recipientUserIds: [userId],
        });
      });
    }
  }

  return c.json({ data: newReport, message: "Beneficiary delivery confirmed" }, 201);
});


export const createEventReportDeliveryDriverHandler = catchAsync(async (c: Context) => {
  const deliveryId = c.req.param("id");
  const body = await c.get("validatedData").body as unknown as z.infer<typeof CreateDeliveryEventReportSchema>;
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
    entityId: deliveryId,
    reportType: body?.reportType || "other",
    createdBy,
  });

  await confirmDriverDelivery({
    deliveryId,
    deliveredPortion: body?.deliveredPortion,
    takenTray: body?.takenTray,
    updatedBy: createdBy,
  });

  if (newReport) {
    await publishEventReportCommit({
      entityId: newReport.id,
      storageIds: body.storageIds,
      entityType: "other"
    });

    if (actorDomain !== "beneficiary") {
      const users = await getListUsersByKitchen({ kitchenId: kitchenByUser, entityTypes: ["kitchen", "driver"] });
      users.forEach((userId) => {
        sendProcessStatusNotification({
          status: "COMPLETED",
          basePayload: {
            variant: "information",
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
            userActorId: newReport.updatedBy!,
          },
          config: {
            step: "Pengiriman Berhasil",
            title: "Pengiriman Berhasil",
            message: `Pengiriman Berhasil`,
          },
          recipientUserIds: [userId],
        });
      });
    }
  }

  return c.json({ data: newReport, message: "Driver delivery confirmed" }, 201);
});


