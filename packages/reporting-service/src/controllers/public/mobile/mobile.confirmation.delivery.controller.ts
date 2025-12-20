import { publishEventReportCommit } from "@/messaging/publishers/reporting.publisher";
import { createEventReport } from "@/services/repositories/event.report.service";
import { confirmBeneficiaryDelivery, confirmDriverDelivery } from "@/services/repositories/mobile.delivery.confirmation.service";
import { catchAsync } from "@/utils/catchAsync";
import { CreateDeliveryEventReportSchema } from "@/validator/confirm.delivery.validation";
import { Context } from "hono";
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
  const { createdBy } = getAuditFields(c);

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
  }

  return c.json({ data: newReport, message: "Beneficiary delivery confirmed" }, 201);
});


export const createEventReportDeliveryDriverHandler = catchAsync(async (c: Context) => {
  const deliveryId = c.req.param("id");
  const body = await c.get("validatedData").body as unknown as z.infer<typeof CreateDeliveryEventReportSchema>;
  const { createdBy } = getAuditFields(c);

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
  }

  return c.json({ data: newReport, message: "Driver delivery confirmed" }, 201);
});
