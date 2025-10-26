
import { db } from "@/db";
import { deliveries, } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, InferSelectModel, InferInsertModel } from "drizzle-orm";

export type Delivery = InferSelectModel<typeof deliveries>;
export type DeliveryStatus = Delivery['status'];

export type NewDelivery = Omit<
  InferInsertModel<typeof deliveries>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'status'
> & { status?: DeliveryStatus; };

export type UpdateDelivery = Partial<Omit<NewDelivery, 'createdBy'>> & { updatedBy: string; };

export async function getDeliveriesList({
  page, limit, kitchenId, driverId, status, isDeleted = false
}: {
  page: number; limit: number; kitchenId?: string; driverId?: string; status?: DeliveryStatus; isDeleted?: boolean;
}): Promise<APIPagination<Delivery>> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [eq(deliveries.isDeleted, isDeleted)];

  if (kitchenId) whereConditions.push(eq(deliveries.kitchenId, kitchenId));
  if (driverId) whereConditions.push(eq(deliveries.driverId, driverId));
  if (status) whereConditions.push(eq(deliveries.status, status));

  const dataPromise = db.select().from(deliveries).where(and(...whereConditions))
    .limit(limit).offset(offset).orderBy(desc(deliveries.startTime));

  const countPromise = db.select({ count: sql<number>`count(*)` }).from(deliveries)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise.execute()]);
  const total = Number(countResult[0].count);

  return { data: data as Delivery[], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  const item = await db.query.deliveries.findFirst({
    where: (deliveries, { eq, and }) => and(eq(deliveries.id, id), eq(deliveries.isDeleted, false)),
  });
  return item ?? null;
}


export async function createDelivery(data: NewDelivery): Promise<Delivery> {
  const [newItem] = await db.insert(deliveries)
    .values({
      ...data,
      status: data?.status || 'PENDING',
      updatedAt: new Date(),
      updatedBy: data.createdBy
    })
    .returning();
  return newItem;
}

export async function updateDelivery(id: string, data: UpdateDelivery): Promise<Delivery | null> {
  const [updatedItem] = await db.update(deliveries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliveries.id, id))
    .returning();
  return updatedItem ?? null;
}

export async function updateDeliveryStatus(id: string, status: DeliveryStatus, updatedBy: string): Promise<Delivery | null> {
  const [updatedItem] = await db.update(deliveries)
    .set({ status: status, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(deliveries.id, id))
    .returning();
  return updatedItem ?? null;
}

export async function softDeleteDelivery(id: string, updatedBy: string): Promise<Delivery | null> {
  const [deletedItem] = await db.update(deliveries)
    .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(deliveries.id, id))
    .returning();
  return deletedItem ?? null;
}