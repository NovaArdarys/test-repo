
import { db } from "@/db";
import { deliveries, } from "@/db/schemas";
import { entityTypeEnum } from "@/validator/globa.validator";
import { eq, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { isEmpty } from "lodash";
import z from "zod";

export type Delivery = InferSelectModel<typeof deliveries>;
export type DeliveryStatus = Delivery['status'];

export type NewDelivery = Omit<
  InferInsertModel<typeof deliveries>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'status'
> & { status?: DeliveryStatus; };

export type UpdateDelivery = Partial<Omit<NewDelivery, 'createdBy'>> & { updatedBy: string; };

export async function getDeliveriesListDriver({
  page,
  limit,
  kitchenIds,
  driverIds,
  schoolIds,
  status,
  isDeleted = false,
  startDate,
  endDate,
}: {
  page: number;
  limit: number;
  kitchenIds?: string[];
  driverIds?: string[];
  schoolIds?: string[];
  status?: string;
  isDeleted?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  entity?: z.infer<typeof entityTypeEnum>;
}) {
  const offset = (page - 1) * limit;

  function toLocalPgTimestamp(dateStr: string, endOfDay = false) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    if (endOfDay) d.setHours(23, 59, 59, 999);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
      d.getMilliseconds()
    ).padStart(3, "0")}`;
  }

  const today = new Date();
  const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const defaultEnd = defaultStart;

  const start = startDate ? toLocalPgTimestamp(startDate) : toLocalPgTimestamp(defaultStart);
  const end = endDate ? toLocalPgTimestamp(endDate, true) : toLocalPgTimestamp(defaultEnd, true);

  const conditions: string[] = [`d.is_deleted = ${isDeleted}`];
  if (!isEmpty(kitchenIds)) {
    conditions.push(`d.kitchen_id = ANY(ARRAY[${kitchenIds?.map((id) => `'${id}'`).join(",")}]::uuid[])`);
  }
  if (!isEmpty(driverIds)) {
    conditions.push(`d.driver_id = ANY(ARRAY[${driverIds?.map((id) => `'${id}'`).join(",")}]::uuid[])`);
  }
  if (status) {
    conditions.push(`d.status = '${status}'`);
  }

  const kitchenFilterSql = !isEmpty(kitchenIds)
    ? `AND mp.kitchen_id = ANY(ARRAY[${kitchenIds?.map((id) => `'${id}'`).join(",")}]::uuid[])`
    : "";

  const schoolFilterSql = !isEmpty(schoolIds)
    ? `AND ds.beneficiary_id = ANY(ARRAY[${schoolIds?.map((id) => `'${id}'`).join(",")}]::uuid[])`
    : "";

  conditions.push(`
    EXISTS (
      SELECT 1
      FROM delivery_beneficiaries ds
      JOIN menu_plans mp ON ds.menu_plan_id = mp.id
      WHERE ds.delivery_id = d.id
      ${schoolFilterSql}
      ${kitchenFilterSql}
      AND mp.plan_start_date >= '${start}'
      AND mp.plan_start_date <= '${end}'
    )
  `);

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      d.id,
      d.start_time AS "startTime",
      d.end_time AS "endTime",
      d.estimated_delivery_time AS "estimatedDeliveryTime",
      d.notes,
      d.portion_type AS "portionType",
      d.status,
      d.created_at AS "createdAt",
      json_build_object(
        'id', k.id,
        'name', k.name,
        'address', k.address,
        'phoneNumber', k.phone_number,
        'lon', k.lon,
        'lat', k.lat,
        'storageId', k.storage_id,
        'imageURL', k.image_url
      ) AS kitchen,
      json_build_object(
        'id', dr.id,
        'licenseNumber', dr.license_number,
        'profile', json_build_object(
          'firstName', ud.first_name,
          'lastName', ud.last_name,
          'phoneNumber', ud.phone_number,
          'address', ud.address,
          'dateOfBirth', ud.date_of_birth,
          'storageId', ud.storage_id,
          'imageURL', ud.image_url
        ),
        'locations',
        (
        SELECT json_build_object(
          'id', dl.id,
          'lon', dl.lon,
          'lat', dl.lat,
          'recordedAt', dl.recorded_at
        )
        FROM driver_locations dl
        WHERE dl.driver_id = dr.id
          AND dl.delivery_id = d.id
        ORDER BY dl.recorded_at DESC
        LIMIT 1
      )
      ) AS driver,
      (
        SELECT json_build_object(
          'id', b.id,
          'name', b.name,
          'address', b.address,
          'phoneNumber', b.phone_number,
          'lon', b.lon,
          'lat', b.lat,
          'category', b.category,
          'imageURL', b.image_url,
          'smallPortion', b.small_portion,
          'largePortion', b.large_portion,
          'status', b.status
        )
        FROM delivery_beneficiaries db
        JOIN beneficiaries b ON b.id = db.beneficiary_id
        WHERE db.delivery_id = d.id
        LIMIT 1
      ) AS beneficiary
    FROM deliveries d
    LEFT JOIN kitchens k ON d.kitchen_id = k.id
    LEFT JOIN drivers dr ON d.driver_id = dr.id
    LEFT JOIN user_details ud ON dr.user_id = ud.user_id
    ${whereSql}
    ORDER BY d.start_time DESC
    LIMIT ${limit}
    OFFSET ${offset};
  `;

  const data = await db.execute(query);

  const totalResult = await db.execute<{ total: number; }>(`
    SELECT COUNT(*)::int AS total
    FROM deliveries d
    ${whereSql};
  `);

  const total = Number(totalResult.rows?.[0]?.total ?? 0);

  return {
    data: data.rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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

export async function softDeleteDelivery(id: string, updatedBy: string): Promise<Delivery | null> {
  const [deletedItem] = await db.update(deliveries)
    .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(deliveries.id, id))
    .returning();
  return deletedItem ?? null;
}

interface UpdateDeliveryStatusInput {
  deliveryId: string;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "FAILED";
  updatedBy: string;
}

export const updateDeliveryStatus = async ({
  deliveryId,
  status,
  updatedBy
}: UpdateDeliveryStatusInput) => {

  const isFinished =
    status === "DELIVERED" ||
    status === "FAILED";

  const [updated] = await db
    .update(deliveries)
    .set({
      status,
      endTime: isFinished ? new Date() : null,
      updatedAt: new Date(),
      updatedBy
    })
    .where(eq(deliveries.id, deliveryId))
    .returning();

  return updated;
};