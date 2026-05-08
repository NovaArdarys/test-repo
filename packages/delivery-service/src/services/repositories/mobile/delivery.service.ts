import { db } from "@/db";
import { deliveries } from "@/db/schemas";
import { InferSelectModel } from "drizzle-orm";

export type Delivery = InferSelectModel<typeof deliveries>;

export interface GetDeliveriesByKitchenDateParams {
  kitchenId: string;
  deliveryDate: Date | string;
  portionType?: string;
  excludeDeliveryId?: string;
}

function normalizeDate(date: Date | string): string {
  return typeof date === "string"
    ? date
    : date.toISOString().split("T")[0];
}

export async function getDeliveriesByKitchenDate(
  params: GetDeliveriesByKitchenDateParams
): Promise<Delivery[]> {
  const {
    kitchenId,
    deliveryDate,
    portionType,
    excludeDeliveryId,
  } = params;

  const normalizedDate = normalizeDate(deliveryDate);

  return db.query.deliveries.findMany({
    where: (d, { eq, and, ne }) => {
      const conditions = [
        eq(d.kitchenId, kitchenId),
        eq(d.deliveryDate, normalizedDate),
        eq(d.isDeleted, false),
      ];

      if (portionType) {
        conditions.push(eq(d.portionType, portionType));
      }

      if (excludeDeliveryId) {
        conditions.push(ne(d.id, excludeDeliveryId));
      }

      return and(...conditions);
    },
    orderBy: (d, { asc }) => asc(d.deliveryOrder),
  });
}

export async function getExpectedDeliveryOrder(
  params: GetDeliveriesByKitchenDateParams
): Promise<number> {
  const deliveries = await getDeliveriesByKitchenDate(params);

  if (deliveries.length === 0) return 0;

  return Math.max(
    ...deliveries.map(d => d.deliveryOrder ?? 0)
  ) + 1;
}

export async function getDeliveryById(
  deliveryId: string
): Promise<Delivery | null> {
  const delivery = await db.query.deliveries.findFirst({
    where: (d, { eq, and }) =>
      and(
        eq(d.id, deliveryId),
        eq(d.isDeleted, false)
      ),
  });

  return delivery ?? null;
}

export async function isDeliveryOrderSequential(
  params: GetDeliveriesByKitchenDateParams
): Promise<{
  isSequential: boolean;
  expected: number;
  current?: number;
}> {
  const deliveries = await getDeliveriesByKitchenDate(params);

  for (let i = 0; i < deliveries.length; i++) {
    const expectedOrder = i;
    const currentOrder = deliveries[i].deliveryOrder ?? 0;

    if (currentOrder !== expectedOrder) {
      return {
        isSequential: false,
        expected: expectedOrder,
        current: currentOrder || undefined,
      };
    }
  }

  return {
    isSequential: true,
    expected: deliveries.length,
  };
}

export async function getDeliveriesByDriverId(
  driverId: string,
  deliveryDate?: Date | string
): Promise<Delivery[]> {
  return db.query.deliveries.findMany({
    where: (d, { eq, and }) => {
      const conditions = [
        eq(d.driverId, driverId),
        eq(d.isDeleted, false),
      ];

      if (deliveryDate) {
        conditions.push(eq(d.deliveryDate, normalizeDate(deliveryDate)));
      }

      return and(...conditions);
    },
    orderBy: (d, { asc }) => asc(d.deliveryOrder),
  });
}

export async function getDeliveriesByKitchenId(params: {
  kitchenId: string;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}): Promise<Delivery[]> {
  const { kitchenId, status, startDate, endDate } = params;

  return db.query.deliveries.findMany({
    where: (d, { eq, and, gte, lte }) => {
      const conditions = [
        eq(d.kitchenId, kitchenId),
        eq(d.isDeleted, false),
      ];

      if (status) {
        conditions.push(eq(d.status, status as any));
      }

      if (startDate) {
        conditions.push(gte(d.deliveryDate, normalizeDate(startDate)));
      }

      if (endDate) {
        conditions.push(lte(d.deliveryDate, normalizeDate(endDate)));
      }

      return and(...conditions);
    },
    orderBy: (d, { asc }) => [
      asc(d.deliveryDate),
      asc(d.deliveryOrder),
    ],
  });
}

export async function getDriverUserId(
  driverId: string
): Promise<string | null> {
  const driver = await db.query.drivers.findFirst({
    where: (d, { eq, and }) =>
      and(
        eq(d.id, driverId),
        eq(d.isDeleted, false)
      ),
    columns: { userId: true },
  });

  return driver?.userId ?? null;
}

export async function getMissingPreviousDeliveries(delivery: Delivery): Promise<Delivery[]> {
  const allDeliveries = await getDeliveriesByKitchenDate({
    kitchenId: delivery.kitchenId,
    deliveryDate: delivery.deliveryDate!,
    portionType: delivery.portionType || undefined,
  });

  const currentOrder = delivery.deliveryOrder ?? 0;

  return allDeliveries.filter(d =>
    d.driverId === delivery.driverId &&
    (d.deliveryOrder ?? 0) < currentOrder &&
    d.status !== 'DELIVERED'
  );
}