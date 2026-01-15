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
  menuPlanBeneficiaries,
  menuPlans,
} from "@/db/schemas";
import { format, parseISO, startOfDay } from "date-fns";
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

function regionScope(params: {
  provinceId?: string;
  regencyId?: string;
  districtId?: string;
  villageId?: string;
}) {
  if (params.villageId) {
    return eq(villages.id, params.villageId);
  }

  if (params.districtId) {
    return eq(districts.id, params.districtId);
  }

  if (params.regencyId) {
    return eq(regencies.id, params.regencyId);
  }

  if (params.provinceId) {
    return eq(provinces.id, params.provinceId);
  }

  return undefined;
}


export async function getDashboardData(params: DashboardParams) {
  const {
    startDate,
    endDate,
    page,
    limit,
    audit,
    provinceId,
    regencyId,
    districtId,
    villageId
  } = params;

  const activeRegionScope = regionScope({
    provinceId,
    regencyId,
    districtId,
    villageId,
  });

  const beneficiaryKitchenScope = scopeOrAll(
    beneficiaries.kitchenId,
    audit.kitchenId
  );

  const today = format(new Date(), "yyyy-MM-dd");

  const [summary] = await db
    .select({
      totalPorsi: sql<number>`
      COALESCE(
        SUM(
          COALESCE(${menuPlanBeneficiaries.smallPortion}, 0)
        + COALESCE(${menuPlanBeneficiaries.largePortion}, 0)
        ),
        0
      )
    `,
      totalPenerima: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
    })
    .from(beneficiaries)
    .leftJoin(
      menuPlanBeneficiaries,
      and(
        eq(menuPlanBeneficiaries.beneficiaryId, beneficiaries.id),
        eq(menuPlanBeneficiaries.isDeleted, false)
      )
    )
    .leftJoin(
      menuPlans,
      and(
        eq(menuPlans.id, menuPlanBeneficiaries.menuPlanId),
        eq(menuPlans.isDeleted, false),
        lte(menuPlans.planStartDate, today),
        lte(menuPlans.planEndDate, today),
        scopeOrAll(menuPlans.kitchenId, audit.kitchenId),
        startDate ? gte(menuPlans.planStartDate, startDate) : undefined,
        endDate ? lte(menuPlans.planEndDate, endDate) : undefined
      )
    )
    .where(
      and(
        audit.isAppManager ? sql`TRUE` : scopeOrAll(beneficiaries.kitchenId, audit.kitchenId),
        startDate ? gte(beneficiaries.joinedDate, startOfDay(parseISO(startDate))) : undefined,
        endDate ? lte(beneficiaries.joinedDate, startOfDay(parseISO(endDate))) : undefined
      )
    );


  const [totalLaporan] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${eventReports.id})` })
    .from(eventReports)
    .where(
      and(
        eq(eventReports.isDeleted, false),
        startDate ? gte(eventReports.date, startDate) : undefined,
        endDate ? lte(eventReports.date, endDate) : undefined,
        audit.isAppManager ? undefined : scopeOrAll(eventReports.domainId, audit.kitchenId)
      )
    );

  const portionTrend = await db
    .select({
      date: menuPlans.planStartDate,
      total: sql<number>`
      COALESCE(
        SUM(
          COALESCE(${menuPlanBeneficiaries.smallPortion}, 0)
        + COALESCE(${menuPlanBeneficiaries.largePortion}, 0)
        ),
        0
      )
    `,
    })
    .from(menuPlanBeneficiaries)
    .leftJoin(
      menuPlans,
      eq(menuPlans.id, menuPlanBeneficiaries.menuPlanId)
    )
    .where(
      and(
        eq(menuPlanBeneficiaries.isDeleted, false),
        eq(menuPlans.isDeleted, false),

        lte(menuPlans.planStartDate, today),
        lte(menuPlans.planEndDate, today),

        startDate ? gte(menuPlans.planStartDate, startDate) : undefined,
        endDate ? lte(menuPlans.planStartDate, endDate) : undefined,
        scopeOrAll(menuPlans.kitchenId, audit.kitchenId)
      )
    )
    .groupBy(menuPlans.planStartDate)
    .orderBy(asc(menuPlans.planStartDate));

  // const [summary] = await db
  //   .select({
  //     totalPorsi: sql<number>`
  //       COALESCE(SUM(${deliveries.deliveredPortion}), 0)
  //     `,
  //     totalPenerima: sql<number>`
  //       COUNT(DISTINCT ${beneficiaries.id})
  //     `,
  //     totalLaporan: sql<number>`
  //       COUNT(DISTINCT ${eventReports.id})
  //     `,
  //   })
  //   .from(deliveries)
  //   .leftJoin(
  //     beneficiaries,
  //     eq(beneficiaries.kitchenId, deliveries.kitchenId)
  //   )
  //   .leftJoin(
  //     eventReports,
  //     eq(eventReports.entityId, beneficiaries.id)
  //   )
  //   .leftJoin(
  //     kitchens,
  //     eq(kitchens.id, deliveries.kitchenId)
  //   )
  //   .where(
  //     and(
  //       eq(deliveries.status, "DELIVERED"),
  //       startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
  //       endDate ? lte(deliveries.deliveryDate, endDate) : undefined,
  //       deliveryKitchenScope
  //     )
  //   );

  // const portionTrend = await db
  //   .select({
  //     date: deliveries.deliveryDate,
  //     total: sql<number>`
  //       COALESCE(SUM(${deliveries.deliveredPortion}), 0)
  //     `,
  //   })
  //   .from(deliveries)
  //   .leftJoin(
  //     kitchens,
  //     eq(kitchens.id, deliveries.kitchenId)
  //   )
  //   .where(
  //     and(
  //       eq(deliveries.status, "DELIVERED"),
  //       startDate ? gte(deliveries.deliveryDate, startDate) : undefined,
  //       endDate ? lte(deliveries.deliveryDate, endDate) : undefined,
  //       deliveryKitchenScope
  //     )
  //   )
  //   .groupBy(deliveries.deliveryDate)
  //   .orderBy(asc(deliveries.deliveryDate));

  const level: RegionLevel = params.regionLevel ?? "regency";

  let regionRaw: {
    regionId: string | null;
    regionName: string | null;
    parentRegionId: string | null;
    level: string;
    total: number;
  }[] = [];

  if (level === "province") {
    regionRaw = await db
      .select({
        regionId: provinces.id,
        regionName: provinces.name,
        parentRegionId: provinces.id,
        level: sql<string>`'province'`,
        total: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, beneficiaries.regencyId)
      )
      .leftJoin(
        provinces,
        eq(provinces.id, regencies.provinceId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope,
          activeRegionScope
        )
      )
      .groupBy(provinces.id, provinces.name);
  }

  if (level === "regency") {
    regionRaw = await db
      .select({
        regionId: regencies.id,
        regionName: regencies.name,
        parentRegionId: regencies.provinceId,
        level: sql<string>`'regency'`,
        total: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        regencies,
        eq(regencies.id, beneficiaries.regencyId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope,
          activeRegionScope
        )
      )
      .groupBy(regencies.id, regencies.name);
  }

  if (level === "district") {
    regionRaw = await db
      .select({
        regionId: districts.id,
        regionName: districts.name,
        parentRegionId: districts.regencyId,
        level: sql<string>`'district'`,
        total: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        districts,
        eq(districts.id, beneficiaries.districtId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope,
          activeRegionScope
        )
      )
      .groupBy(districts.id, districts.name);
  }

  if (level === "village") {
    regionRaw = await db
      .select({
        regionId: villages.id,
        regionName: villages.name,
        parentRegionId: villages.districtId,
        level: sql<string>`'village'`,
        total: sql<number>`COUNT(DISTINCT ${beneficiaries.id})`,
      })
      .from(beneficiaries)
      .leftJoin(
        kitchens,
        eq(kitchens.id, beneficiaries.kitchenId)
      )
      .leftJoin(
        villages,
        eq(villages.id, beneficiaries.villageId)
      )
      .where(
        and(
          eq(beneficiaries.isDeleted, false),
          beneficiaryKitchenScope,
          activeRegionScope
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
    parentRegionId: r.parentRegionId ?? "Tidak Diketahui",
    percentage: totalRegion
      ? Math.round((Number(r.total) / totalRegion) * 100)
      : 0,
  }));

  const latestEvents = await db
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
      users,
      eq(users.id, eventReports.createdBy)
    )
    .where(
      and(
        eq(eventReports.isDeleted, false),
        startDate ? gte(eventReports.date, startDate) : undefined,
        endDate ? lte(eventReports.date, endDate) : undefined,
        scopeOrAll(eventReports.domainId, audit.kitchenId)
      )
    )
    .orderBy(desc(eventReports.createdAt))
    .limit(5);

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
    .orderBy(desc(suppliers.createdAt))
    .limit(5);


  return {
    summary: {
      totalPorsi: Number(summary?.totalPorsi ?? 0),
      totalPenerima: Number(summary?.totalPenerima ?? 0),
      totalLaporan: Number(totalLaporan?.count ?? 0),
    },
    charts: {
      portionTrend,
      distribution,
    },
    tables: {
      events: latestEvents,
      suppliers: supplierRows,
    },
  };
}
