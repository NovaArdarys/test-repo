import { db } from "@/db";
import { beneficiaries } from "@/db/schemas";
import { and, eq, inArray, or, isNull, sql } from "drizzle-orm";

export async function getActiveBeneficiariesByKitchen(
  kitchenIds: string[]
) {
  if (!kitchenIds || kitchenIds.length === 0) return [];

  const rows = await db
    .select({
      id: beneficiaries.id,
      kitchenId: beneficiaries.kitchenId,
      status: beneficiaries.status,
      smallPortion: beneficiaries.smallPortion,
      largePortion: beneficiaries.largePortion,
    })
    .from(beneficiaries)
    .where(
      and(
        inArray(beneficiaries.kitchenId, kitchenIds),
        or(eq(beneficiaries.isDeleted, false), isNull(beneficiaries.isDeleted)),
        or(
          eq(sql`LOWER(${beneficiaries.status}::text)`, 'active'),
          eq(sql`LOWER(${beneficiaries.status}::text)`, 'aktif'),
          isNull(beneficiaries.status)
        )
      )
    );

  return rows;
}
