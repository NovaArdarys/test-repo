import {
  beneficiaries,
  menuPlanBeneficiaries
} from "@/db/schemas";
import { and, eq, or } from "drizzle-orm";
import { MenuPlanBeneficiariesRow, Trx } from "../types/domain";

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
        eq(beneficiaries.isDeleted, false),
        or(eq(beneficiaries.status, "ACTIVE"), eq(beneficiaries.status, "AKTIF")
        )
      )
    )
    .then(res => res.map(r => r.menu_plan_beneficiaries));

  return rows;
}
