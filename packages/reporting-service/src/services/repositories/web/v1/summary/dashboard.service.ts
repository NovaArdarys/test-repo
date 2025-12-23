// src/services/repositories/dashboard.service.ts
import { db } from "@/db";
import {
  deliveries,
  beneficiaries,
  eventReports,
  kitchens,
  suppliers,
  users,
} from "@/db/schemas";
import { and, eq, gte, lte, sql, desc, asc } from "drizzle-orm";

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
  audit: {
    kitchenId?: string[];
    beneficiaryId?: string[];
    driverId?: string[];
    isAppManager: boolean;
  };
};

export async function getDashboardData(params: DashboardParams) {
  const {
    startDate,
    endDate,
    page,
    limit,
    audit,
  } = params;

  const offset = (page - 1) * limit;

  //  SUMMARY
  const [summary] = await db
    .select({
      totalPorsi: sql<number>`COALESCE(SUM(${deliveries.deliveredPortion}), 0)`,
      totalPenerima: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
      totalLaporan: sql<number>`COUNT(DISTINCT ${eventReports.id})`,
    })
    .from(deliveries)
    .leftJoin(beneficiaries, eq(beneficiaries.kitchenId, deliveries.kitchenId))
    .leftJoin(eventReports, eq(eventReports.entityId, beneficiaries.id))
    .where(
      and(
        eq(deliveries.status, "DELIVERED"),
        startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
        endDate ? lte(deliveries.deliveryDate, endDate) : undefined,
        audit.kitchenId?.length
          ? sql`${deliveries.kitchenId} = ANY(${audit.kitchenId})`
          : undefined
      )
    );

  //  CHART — TOTAL PORSI
  const portionTrend = await db
    .select({
      date: deliveries.deliveryDate,
      total: sql<number>`SUM(${deliveries.deliveredPortion})`,
    })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.status, "DELIVERED"),
        startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
        endDate ? lte(deliveries.deliveryDate, endDate) : undefined
      )
    )
    .groupBy(deliveries.deliveryDate)
    .orderBy(asc(deliveries.deliveryDate));

  // PIE — PERSEBARAN WILAYAH
  const regionRaw = await db
    .select({
      regionId: kitchens.regencyId,
      total: sql<number>`COUNT(${beneficiaries.id})`,
    })
    .from(beneficiaries)
    .leftJoin(kitchens, eq(kitchens.id, beneficiaries.kitchenId))
    .where(eq(beneficiaries.isDeleted, false))
    .groupBy(kitchens.regencyId);

  const totalRegion = regionRaw.reduce(
    (sum, r) => sum + Number(r.total),
    0
  );

  const distribution = regionRaw.map((r) => ({
    regionId: r.regionId,
    percentage: totalRegion
      ? Math.round((Number(r.total) / totalRegion) * 100)
      : 0,
  }));

  // TABLE — LAPORAN KEJADIAN
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
    .leftJoin(users, eq(users.id, eventReports.createdBy))
    .where(
      and(
        eq(eventReports.isDeleted, false),
        startDate ? gte(eventReports.date, startDate) : undefined,
        endDate ? lte(eventReports.date, endDate) : undefined
      )
    )
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  // TABLE — SUPPLIER
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
    .leftJoin(kitchens, eq(kitchens.id, suppliers.kitchenId))
    .where(eq(suppliers.isDeleted, false))
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
