import { db } from "@/db";
import {
  deliveries,
  drivers,
  userDetails,
  kitchens,
  deliveryBeneficiaries,
  beneficiaries,
  driverLocations,
  menuPlans
} from "@/db/schemas";
import { and, eq, sql, inArray, ne } from "drizzle-orm";
import { isEmpty } from "lodash";

export async function getDeliveriesListBeneficiary({
  page,
  limit,
  schoolIds,
  driverIds,
  kitchenIds,
  status,
  isDeleted = false,
  startDate,
  endDate,
}: {
  page: number;
  limit: number;
  schoolIds?: string[];
  kitchenIds?: string[];
  driverIds?: string[];
  status?: string;
  isDeleted?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const offset = (page - 1) * limit;

  const conditions = [
    eq(deliveries.isDeleted, isDeleted),
    status ? eq(deliveries.status, status as any) : ne(deliveries.status, "DELIVERED"),
    !isEmpty(kitchenIds) ? inArray(deliveries.kitchenId, kitchenIds!) : undefined,
    !isEmpty(driverIds) ? inArray(deliveries.driverId, driverIds!) : undefined,
  ].filter(Boolean);

  const beneficiaryArray =
    !isEmpty(schoolIds)
      ? sql`ARRAY[${sql.join(
        schoolIds!.map((id) => sql`${id}::uuid`),
        sql`,`
      )}]`
      : undefined;

  const existsCondition = sql`
    EXISTS (
      SELECT 1
      FROM ${deliveryBeneficiaries} db
      JOIN ${deliveries} d2 ON d2.id = db.delivery_id
      JOIN ${menuPlans} mp ON db.menu_plan_id = mp.id
      WHERE db.delivery_id = ${deliveries.id}
        ${beneficiaryArray ? sql`AND db.beneficiary_id = ANY(${beneficiaryArray})` : sql``}
        AND mp.plan_start_date >= ${startDate}
        AND mp.plan_start_date <= ${endDate}
    )
  `;

  const whereCondition = and(...conditions, existsCondition);

  const totalResult = await db.execute(sql`
    SELECT COUNT(DISTINCT d.id) AS total
    FROM ${deliveries} d
    WHERE d.is_deleted = ${isDeleted}
      AND EXISTS (
        SELECT 1
        FROM ${deliveryBeneficiaries} db
        JOIN ${menuPlans} mp ON db.menu_plan_id = mp.id
        WHERE db.delivery_id = d.id
          ${beneficiaryArray ? sql`AND db.beneficiary_id = ANY(${beneficiaryArray})` : sql``}
          AND mp.plan_start_date >= ${startDate}
          AND mp.plan_start_date <= ${endDate}
      )
  `);

  const total = Number(totalResult.rows?.[0]?.total ?? 0);

  const rows = await db
    .select({
      id: deliveries.id,
      startTime: deliveries.startTime,
      endTime: deliveries.endTime,
      estimatedDeliveryTime: deliveries.estimatedDeliveryTime,
      notes: deliveries.notes,
      portionType: deliveries.portionType,
      status: deliveries.status,
      createdAt: deliveries.createdAt,

      kitchen: sql`json_build_object(
        'id', ${kitchens.id},
        'name', ${kitchens.name},
        'address', ${kitchens.address},
        'phoneNumber', ${kitchens.phoneNumber},
        'lon', ${kitchens.lon},
        'lat', ${kitchens.lat},
        'storageId', ${kitchens.storageId},
        'imageURL', ${kitchens.imageURL}
      )`,

      driver: sql`json_build_object(
        'id', ${drivers.id},
        'licenseNumber', ${drivers.licenseNumber},
        'profile', json_build_object(
          'firstName', ${userDetails.firstName},
          'lastName', ${userDetails.lastName},
          'phoneNumber', ${userDetails.phoneNumber},
          'address', ${userDetails.address},
          'dateOfBirth', ${userDetails.dateOfBirth},
          'storageId', ${userDetails.storageId},
          'imageURL', ${userDetails.imageURL}
        ),
        'locations', (
          SELECT json_build_object(
            'id', dl.id,
            'lon', dl.lon,
            'lat', dl.lat,
            'recordedAt', dl.recorded_at
          )
          FROM ${driverLocations} dl
          WHERE dl.driver_id = ${drivers.id}
            AND dl.delivery_id = ${deliveries.id}
          ORDER BY dl.recorded_at DESC
          LIMIT 1
        )
      )`,

      beneficiary: sql`(
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
        FROM ${deliveryBeneficiaries} db
        JOIN ${beneficiaries} b ON b.id = db.beneficiary_id
        WHERE db.delivery_id = ${deliveries.id}
        LIMIT 1
      )`,
    })
    .from(deliveries)
    .leftJoin(kitchens, eq(kitchens.id, deliveries.kitchenId))
    .leftJoin(drivers, eq(drivers.id, deliveries.driverId))
    .leftJoin(userDetails, eq(userDetails.userId, drivers.userId))
    .where(whereCondition)
    .orderBy(deliveries.startTime)
    .limit(limit)
    .offset(offset);

  const driversMap = new Map<string, any>();

  for (const row of rows) {
    const driver = row.driver as any;
    const driverId = driver?.id ?? "NO_DRIVER";
    const { driver: _, ...delivery } = row;

    if (!driversMap.has(driverId)) {
      driversMap.set(driverId, { ...driver, deliveries: [] });
    }

    driversMap.get(driverId).deliveries.push(delivery);
  }

  return {
    data: Array.from(driversMap.values()),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDeliveryBeneficiary(deliveryId: string) {
  const rows = await db
    .select({
      id: deliveryBeneficiaries.id,
      deliveryId: deliveryBeneficiaries.deliveryId,
      beneficiaryId: deliveryBeneficiaries.beneficiaryId,
      menuPlanId: deliveryBeneficiaries.menuPlanId,
      beneficiaryName: beneficiaries.name,
      smallPortion: beneficiaries.smallPortion,
      largePortion: beneficiaries.largePortion,
      lat: beneficiaries.lat,
      lon: beneficiaries.lon,
      menuPlanStart: menuPlans.planStartDate,
    })
    .from(deliveryBeneficiaries)
    .innerJoin(
      beneficiaries,
      eq(beneficiaries.id, deliveryBeneficiaries.beneficiaryId)
    )
    .innerJoin(
      menuPlans,
      eq(menuPlans.id, deliveryBeneficiaries.menuPlanId)
    )
    .where(eq(deliveryBeneficiaries.deliveryId, deliveryId))
    .limit(1);

  return rows[0] ?? null;
}