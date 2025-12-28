// src/services/repositories/dashboard.service.ts
import { db } from "@/db";
import {
  deliveries,
  beneficiaries,
  eventReports,
  kitchens,
  suppliers,
  users,
  regencies,
  districts,
  villages,
  provinces,
} from "@/db/schemas";
import { and, eq, gte, lte, sql, desc, asc, inArray } from "drizzle-orm";

export type RegionLevel = "province" | "regency" | "district" | "village";

type DashboardParams = {
  startDate?: string;
  endDate?: string;
  provinceId?: string;
  regencyId?: string;
  districtId?: string;
  villageId?: string;
  status?: string;
  page: number;
  limit: number;
  regionLevel?: RegionLevel;
  audit: {
    kitchenId?: string[];
    beneficiaryId?: string[];
    driverId?: string[];
    isAppManager: boolean;
  };
};


const scopeOrAll = <T>(
  column: T,
  ids?: string[]
) => {
  return ids?.length
    ? inArray(column as any, ids)
    : undefined;
};

export async function getDashboardData(params: DashboardParams) {
  const {
    startDate,
    endDate,
    page,
    limit,
    audit,
  } = params;

  console.log(audit, "=====audit=====");

  const offset = (page - 1) * limit;

  const deliveryKitchenScope = scopeOrAll(
    deliveries.kitchenId,
    audit.kitchenId
  );

  const kitchenScope = scopeOrAll(
    deliveries.kitchenId,
    audit.kitchenId,
  );

  const beneficiaryKitchenScope = scopeOrAll(
    beneficiaries.kitchenId,
    audit.kitchenId
  );

  const [summary] = await db
    .select({
      totalPorsi: sql<number>`
        COALESCE(SUM(${deliveries.deliveredPortion}), 0)
      `,
      totalPenerima: sql<number>`
        COUNT(DISTINCT ${beneficiaries.id})
      `,
      totalLaporan: sql<number>`
        COUNT(DISTINCT ${eventReports.id})
      `,
    })
    .from(deliveries)
    .leftJoin(
      beneficiaries,
      eq(beneficiaries.kitchenId, deliveries.kitchenId)
    )
    .leftJoin(
      eventReports,
      eq(eventReports.entityId, beneficiaries.id)
    )
    .leftJoin(
      kitchens,
      eq(kitchens.id, deliveries.kitchenId)
    )
    .where(
      and(
        eq(deliveries.status, "DELIVERED"),
        startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
        endDate ? lte(deliveries.deliveryDate, endDate) : undefined,
        deliveryKitchenScope
      )
    );

  const portionTrend = await db
    .select({
      date: deliveries.deliveryDate,
      total: sql<number>`
        COALESCE(SUM(${deliveries.deliveredPortion}), 0)
      `,
    })
    .from(deliveries)
    .leftJoin(
      kitchens,
      eq(kitchens.id, deliveries.kitchenId)
    )
    .where(
      and(
        eq(deliveries.status, "DELIVERED"),
        startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
        endDate ? lte(deliveries.deliveryDate, endDate) : undefined,
        deliveryKitchenScope
      )
    )
    .groupBy(deliveries.deliveryDate)
    .orderBy(asc(deliveries.deliveryDate));

  const level: RegionLevel = params.regionLevel ?? "regency";

  let regionRaw: {
    regionId: string | null;
    regionName: string | null;
    level: string;
    total: number;
  }[] = [];

  if (level === "province") {
    regionRaw = await db
      .select({
        regionId: provinces.id,
        regionName: provinces.name,
        level: sql<string>`'province'`,
        total: sql<number>`COUNT(${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, kitchens.regencyId)
      )
      .leftJoin(
        provinces,
        eq(provinces.id, regencies.provinceId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope
        )
      )
      .groupBy(provinces.id, provinces.name);
  }

  if (level === "regency") {
    regionRaw = await db
      .select({
        regionId: regencies.id,
        regionName: regencies.name,
        level: sql<string>`'regency'`,
        total: sql<number>`COUNT(${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, kitchens.regencyId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope
        )
      )
      .groupBy(regencies.id, regencies.name);
  }

  if (level === "district") {
    regionRaw = await db
      .select({
        regionId: districts.id,
        regionName: districts.name,
        level: sql<string>`'district'`,
        total: sql<number>`COUNT(${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, kitchens.regencyId)
      )
      .leftJoin(
        districts,
        eq(districts.regencyId, regencies.id)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope
        )
      )
      .groupBy(districts.id, districts.name);
  }

  if (level === "village") {
    regionRaw = await db
      .select({
        regionId: villages.id,
        regionName: villages.name,
        level: sql<string>`'village'`,
        total: sql<number>`COUNT(${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, kitchens.regencyId)
      )
      .leftJoin(
        districts,
        eq(districts.regencyId, regencies.id)
      )
      .leftJoin(
        villages,
        eq(villages.districtId, districts.id)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope
        )
      )
      .groupBy(villages.id, villages.name);
  }

  const totalRegion = regionRaw.reduce(
    (sum, r) => sum + Number(r.total),
    0
  );

  const distribution = regionRaw.map((r) => ({
    regionId: r.regionId,
    regionName: r.regionName ?? "Tidak Diketahui",
    percentage: totalRegion
      ? Math.round((Number(r.total) / totalRegion) * 100)
      : 0,
  }));

  const events = await db
    .select({
      id: eventReports.id,
      title: eventReports.name,
      date: eventReports.date,
      role: eventReports.entityType,
      category: eventReports.domain,
      pelapor: users.email,
    })
    .from(eventReports)
    .leftJoin(
      beneficiaries,
      eq(beneficiaries.id, eventReports.entityId)
    )
    .leftJoin(
      kitchens,
      eq(kitchens.id, beneficiaries.kitchenId)
    )
    .leftJoin(
      users,
      eq(users.id, eventReports.createdBy)
    )
    .where(
      and(
        eq(eventReports.isDeleted, false),
        startDate ? gte(eventReports.date, startDate) : undefined,
        endDate ? lte(eventReports.date, endDate) : undefined,
        beneficiaryKitchenScope
      )
    )
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  const supplierRows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      bahan: suppliers.description,
      kitchen: kitchens.name,
      phone: suppliers.phoneNumber,
      address: suppliers.address,
    })
    .from(suppliers)
    .leftJoin(
      kitchens,
      eq(kitchens.id, suppliers.kitchenId)
    )
    .where(
      and(
        eq(suppliers.isDeleted, false),
        scopeOrAll(suppliers.kitchenId, audit.kitchenId)
      )
    )
    .orderBy(asc(suppliers.name));

  return {
    summary: {
      totalPorsi: Number(summary?.totalPorsi ?? 0),
      totalPenerima: Number(summary?.totalPenerima ?? 0),
      totalLaporan: Number(summary?.totalLaporan ?? 0),
    },
    charts: {
      portionTrend,
      distribution,
    },
    tables: {
      events,
      suppliers: supplierRows,
    },
  };
}
