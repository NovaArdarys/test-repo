import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListDeliveriesQuerySchemaType
} from "@/validators";

import { updateDeliveryStatus, getDeliveriesListDriver } from "@/services/repositories/mobile/delivery.driver.service";
import { getDeliveriesListKitchen } from "@/services/repositories/mobile/delivery.kitchen.service";
import { getDeliveriesListBeneficiary } from "@/services/repositories/mobile/delivery.beneficery.service";
import { UpdateDeliveryStatusSchemaType } from "../../../validators";
import { sendProcessStatusNotification } from "@/utils/notificationHelper";
import { getListUsersByKitchen } from "@/services/repositories/additional/get.user.by.kitchen.service";
import { resolveKitchenId } from "@/services/repositories/additional/get.kitchen.by.user.service";
import { isEmpty } from "lodash";
import { resolveEntityId } from "@/utils/resolveEntity";
import { getDeliveriesByKitchenDate, getDriverUserId } from "@/services/repositories/mobile/delivery.service";

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



export const listDeliveriesHandler = catchAsync(async (c: Context) => {
  const query = await c.get("validatedData").query as ListDeliveriesQuerySchemaType;
  const param = await c.get("validatedData").param;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const audit = getAuditFields(c);
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;

  if (param?.entity === "driver") {
    const data = await getDeliveriesListDriver({
      page,
      limit,
      kitchenIds: audit.kitchenId,
      driverIds: audit.driverId,
      schoolIds: audit.beneficiaryId,
      startDate,
      endDate,
      entity: param?.entity
    });

    return c.json({ data: data.data, meta: data.meta }, 200);

  }

  if (param?.entity === "beneficiary") {
    const data = await getDeliveriesListBeneficiary({
      page,
      limit,
      kitchenIds: audit.kitchenId,
      driverIds: audit.driverId,
      schoolIds: audit.beneficiaryId,
      startDate,
      endDate,
    });

    return c.json({ data: data.data, meta: data.meta }, 200);

  }

  const data = await getDeliveriesListKitchen({
    page,
    limit,
    kitchenIds: audit.kitchenId,
    driverIds: audit.driverId,
    schoolIds: audit.beneficiaryId,
    startDate,
    endDate,
  });


  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const updateDeliveryStatusHandler = catchAsync(async (c: Context) => {
  const deliveryId = c.req.param("id");

  const { status, imageUrl, storageId } = c.get("validatedData")
    .body as UpdateDeliveryStatusSchemaType;
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

  const { updatedBy } = getAuditFields(c);

  const updatedDelivery = await updateDeliveryStatus({
    deliveryId,
    status,
    imageUrl,
    storageId,
    updatedBy,
  });

  if (updatedDelivery.deliveryOrder) {
    const kitchenByUser = await resolveKitchenId({
      entityType: actorDomain,
      entityId: entityId || "",
    });
    const recipientUserIds = await getListUsersByKitchen({ kitchenId: kitchenByUser, entityTypes: ["kitchen", "beneficiary"] });

    const allDeliveries = await getDeliveriesByKitchenDate({
      kitchenId: updatedDelivery.kitchenId,
      deliveryDate: updatedDelivery.deliveryDate!,
    });

    const otherDeliveries = allDeliveries.filter(d => d.id !== deliveryId);
    const expectedOrder = otherDeliveries.length > 0
      ? Math.max(...otherDeliveries.map(d => d.deliveryOrder ?? 0)) + 1
      : 1;

    if (updatedDelivery.deliveryOrder !== expectedOrder) {

      if (updatedDelivery.driverId) {
        const driverUserId = await getDriverUserId(updatedDelivery.driverId);

        if (
          driverUserId &&
          !recipientUserIds.includes(driverUserId)
        ) {
          recipientUserIds.push(driverUserId);
        }
      }

      await sendProcessStatusNotification({
        status: "FAILED",
        basePayload: {
          entityType: "DELIVERY",
          entityId: updatedDelivery.id,
          kitchenId: updatedDelivery.kitchenId,
          beneficiaryId: undefined,
          relatedId: updatedDelivery.driverId ?? undefined,
          relatedType: updatedDelivery.driverId ? "DRIVER" : undefined,
          jobId: undefined,
          date: updatedDelivery.deliveryDate?.toString() ?? new Date().toISOString().split('T')[0],
          progress: 0,
          result: undefined,
          error: `Urutan Pengiriman tidak sesuai. Urutan saat ini: ${updatedDelivery.deliveryOrder}, seharusnya: ${expectedOrder}`,
          userActorId: updatedBy,
        },
        config: {
          step: "Urutan Pengiriman tidak sesuai",
          title: " Peringatan: Urutan Delivery Tidak Sesuai",
          message: `Delivery untuk tanggal ${updatedDelivery.deliveryDate} diupdate dengan urutan ${updatedDelivery.deliveryOrder}, tetapi seharusnya urutan ${expectedOrder}. Mohon periksa kembali urutan delivery.`,
        },
        recipientUserIds,
      });
    }


    const statusConfig: Record<string, { step: string; title: string; message: string; }> = {
      PENDING: {
        step: "Sedang menunggu",
        title: "Menunggu",
        message: `Delivery urutan ${updatedDelivery.deliveryOrder} untuk tanggal ${updatedDelivery.deliveryDate} sedang menunggu diproses`,
      },
      PREPARING: {
        step: "Sedang disiapkan",
        title: "Sedang Disiapkan",
        message: `Delivery urutan ${updatedDelivery.deliveryOrder} untuk tanggal ${updatedDelivery.deliveryDate} sedang disiapkan`,
      },
      IN_PROGRESS: {
        step: "Sedang diantar",
        title: "Dalam Perjalanan",
        message: `Pengiriman urutan ${updatedDelivery.deliveryOrder} untuk tanggal ${updatedDelivery.deliveryDate} sedang dalam perjalanan`,
      },
      DELIVERED: {
        step: "Berhasil diantar",
        title: "Pengiriman Berhasil",
        message: `Pengiriman urutan ${updatedDelivery.deliveryOrder} untuk tanggal ${updatedDelivery.deliveryDate} telah berhasil diantar`,
      },
      FAILED: {
        step: "Dibatalkan",
        title: "Pengiriman Dibatalkan",
        message: `Pengiriman urutan ${updatedDelivery.deliveryOrder} untuk tanggal ${updatedDelivery.deliveryDate} telah dibatalkan`,
      },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    await sendProcessStatusNotification({
      status: "COMPLETED",
      basePayload: {
        entityType: "DELIVERY",
        entityId: updatedDelivery.id,
        kitchenId: updatedDelivery.kitchenId,
        beneficiaryId: undefined,
        relatedId: updatedDelivery.driverId ?? undefined,
        relatedType: updatedDelivery.driverId ? "DRIVER" : undefined,
        jobId: undefined,
        date: updatedDelivery.deliveryDate?.toString() ?? new Date().toISOString().split('T')[0],
        progress: status === "DELIVERED" ? 100 :
          status === "IN_PROGRESS" ? 75 :
            status === "PENDING" ? 50 : 0,
        result: undefined,
        error: undefined,
        userActorId: updatedBy,
      },
      config,
      recipientUserIds,
    });
  }

  return c.json(
    { data: updatedDelivery, message: "Status updated" },
    200
  );
});
