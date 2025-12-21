import { beneficiaries, menuPlanBeneficiaries } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { MenuPlanBeneficiariesRow, Trx } from "../types/domain";

export default async function fetchBeneficiaries(
  trx: Trx,
  menuPlanId: string
): Promise<MenuPlanBeneficiariesRow[]> {

  const rows = await trx
    .select()
    .from(menuPlanBeneficiaries)
    .where(eq(menuPlanBeneficiaries.menuPlanId, menuPlanId));

  return rows;
}
