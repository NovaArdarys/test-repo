import {
  beneficiaries,
  menuPlanBeneficiaries
} from "@/db/schemas";
import { and, eq, or, sql, isNull } from "drizzle-orm";
import { MenuPlanBeneficiariesRow, Trx } from "../../types/domain";

export default async function fetchBeneficiaries(
  trx: Trx,
  menuPlanId: string
): Promise<MenuPlanBeneficiariesRow[]> {

  const rows = await trx
    .select()
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
    )
    .then(res => res.map(r => r.menu_plan_beneficiaries));

  return rows;
}
