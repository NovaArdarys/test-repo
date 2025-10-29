
import { db } from "@/db";
import { deliveries, deliverySchools, drivers, kitchens, schools, userDetails, } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, InferSelectModel, InferInsertModel, inArray } from "drizzle-orm";
import { isEmpty } from "lodash";

export type Delivery = InferSelectModel<typeof deliveries>;
export type DeliveryStatus = Delivery['status'];

export type NewDelivery = Omit<
  InferInsertModel<typeof deliveries>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'status'
> & { status?: DeliveryStatus; };

export type UpdateDelivery = Partial<Omit<NewDelivery, 'createdBy'>> & { updatedBy: string; };


export async function getDeliveriesList({
  page,
  limit,
  kitchenId,
  driverId,
  status,
  isDeleted = false,
}: {
  page: number;
  limit: number;
  kitchenId?: string[];
  driverId?: string;
  status?: string;
  isDeleted?: boolean;
}) {
  const offset = (page - 1) * limit;

  const conditions: string[] = [`d.is_deleted = ${isDeleted}`];
  if (!isEmpty(kitchenId)) conditions.push(`d.kitchen_id = ANY(ARRAY[${kitchenId?.map((id) => `'${id}'`).join(",")}]::uuid[])`);
  if (driverId) conditions.push(`d.driver_id = '${driverId}'`);
  if (status) conditions.push(`d.status = '${status}'`);

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const data = await db.execute(sql`
    SELECT
      d.id,
      d.kitchen_id AS "kitchenId",
      d.driver_id AS "driverId",
      d.start_time AS "startTime",
      d.end_time AS "endTime",
      d.estimated_delivery_time AS "estimatedDeliveryTime",
      d.notes,
      d.created_at AS "createdAt",
      json_build_object(
        'id', k.id,
        'name', k.name,
        'address', k.address,
        'phoneNumber', k.phone_number,
        'lon', k.lon,
        'lat', k.lat,
        'provinceId', k.province_id,
        'regencyId', k.regency_id,
        'districtId', k.district_id,
        'villageId', k.village_id,
        'storageId', k.storage_id,
        'imageURL', k.image_url,
        'driver', json_build_object(
          'id', dr.id,
          'userId', dr.user_id,
          'kitchenId', dr.kitchen_id,
          'licenseNumber', dr.license_number,
          'profile', json_build_object(
            'userId', ud.user_id,
            'firstName', ud.first_name,
            'lastName', ud.last_name,
            'phoneNumber', ud.phone_number,
            'address', ud.address,
            'dateOfBirth', ud.date_of_birth,
            'storageId', ud.storage_id,
            'imageURL', ud.image_url
          )
        )
      ) AS kitchen,
      (SELECT json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'address', s.address,
            'phoneNumber', s.phone_number,
            'lon', s.lon,
            'lat', s.lat,
            'provinceId', s.province_id,
            'regencyId', s.regency_id,
            'districtId', s.district_id,
            'villageId', s.village_id,
            'storageId', s.storage_id,
            'imageURL', s.image_url
          )
      )
      FROM delivery_schools ds
      JOIN schools s ON ds.school_id = s.id
      WHERE ds.delivery_id = d.id
      ) AS school
    FROM deliveries d
    LEFT JOIN kitchens k ON d.kitchen_id = k.id
    LEFT JOIN drivers dr ON d.driver_id = dr.id
    LEFT JOIN user_details ud ON dr.user_id = ud.user_id
    ${sql.raw(whereSql)}
    ORDER BY d.start_time DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const totalResult = await db.execute<{ total: number; }>(sql`
    SELECT COUNT(*)::int AS total
    FROM deliveries d
    ${sql.raw(whereSql)}
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