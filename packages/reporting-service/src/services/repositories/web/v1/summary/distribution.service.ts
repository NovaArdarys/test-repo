import { db } from "@/db";
import { DashboardFilter } from "../types/index.type";
import { beneficiaries, kitchens } from "@/db/schemas";
import { eq, sql } from "drizzle-orm";

export async function getRegionDistribution(filter: DashboardFilter) {
  const rows = await db
    .select({
      region: kitchens.regencyId,
      total: sql<number>`COUNT(${beneficiaries.id})`,
    })
    .from(beneficiaries)
    .leftJoin(kitchens, eq(kitchens.id, beneficiaries.kitchenId))
    .where(eq(beneficiaries.isDeleted, false))
    .groupBy(kitchens.regencyId);

  const total = rows.reduce((a, b) => a + Number(b.total), 0);

  return rows.map((r) => ({
    regionId: r.region,
    percentage: total
      ? Math.round((Number(r.total) / total) * 100)
      : 0,
  }));
}
