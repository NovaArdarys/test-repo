import {
  beneficiaries,
  menuPlanBeneficiaries
} from "@/db/schemas";
import { and, eq, or, sql, isNull } from "drizzle-orm";
import { BeneficiaryDeliveryRow, Trx } from "../../types/domain";

export default async function fetchBeneficiaries(
  trx: Trx,
  menuPlanId: string
): Promise<BeneficiaryDeliveryRow[]> {

  const rows = await trx
    .select({
      id:                menuPlanBeneficiaries.id,
      menuPlanId:        menuPlanBeneficiaries.menuPlanId,
      beneficiaryId:     menuPlanBeneficiaries.beneficiaryId,
      smallPortion:      menuPlanBeneficiaries.smallPortion,
      largePortion:      menuPlanBeneficiaries.largePortion,
      smallDeliveryTime: menuPlanBeneficiaries.smallDeliveryTime,
      largeDeliveryTime: menuPlanBeneficiaries.largeDeliveryTime,
      isDeleted:         menuPlanBeneficiaries.isDeleted,
      createdAt:         menuPlanBeneficiaries.createdAt,
      createdBy:         menuPlanBeneficiaries.createdBy,
      // Junction table coordinates (may be "0" if not set explicitly)
      junctionLat: menuPlanBeneficiaries.lat,
      junctionLon: menuPlanBeneficiaries.lon,
      // Physical address coordinates from beneficiaries table
      beneficiaryLat: beneficiaries.lat,
      beneficiaryLon: beneficiaries.lon,
    })
    .from(menuPlanBeneficiaries)
    .innerJoin(
      beneficiaries,
      eq(beneficiaries.id, menuPlanBeneficiaries.beneficiaryId)
    )
    .where(
      and(
        eq(menuPlanBeneficiaries.menuPlanId, menuPlanId),
        eq(menuPlanBeneficiaries.isDeleted, false),
        or(eq(beneficiaries.isDeleted, false), isNull(beneficiaries.isDeleted)),
        or(
          eq(sql`LOWER(${beneficiaries.status}::text)`, 'active'),
          eq(sql`LOWER(${beneficiaries.status}::text)`, 'aktif'),
          isNull(beneficiaries.status)
        )
      )
    );

  // Resolve lat/lon in TypeScript:
  // Prefer junction-table coordinate when explicitly set (not null and not "0"),
  // otherwise fall back to the beneficiary's physical address coordinate.
  return rows.map(r => ({
    id:                r.id,
    menuPlanId:        r.menuPlanId,
    beneficiaryId:     r.beneficiaryId,
    smallPortion:      r.smallPortion,
    largePortion:      r.largePortion,
    smallDeliveryTime: r.smallDeliveryTime,
    largeDeliveryTime: r.largeDeliveryTime,
    isDeleted:         r.isDeleted,
    createdAt:         r.createdAt,
    createdBy:         r.createdBy,
    lat: (r.junctionLat && r.junctionLat !== "0") ? r.junctionLat : (r.beneficiaryLat ?? null),
    lon: (r.junctionLon && r.junctionLon !== "0") ? r.junctionLon : (r.beneficiaryLon ?? null),
  }));
}
