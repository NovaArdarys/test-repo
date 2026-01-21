import createPlan from "./helpers/create/createPlan";
import attachFoodItems from "./helpers/attach/attachFoodItems";
import attachBeneficiaries from "./helpers/attach/attachBeneficiaries";
import createKitchenDailyReport from "../stepReport/createKitchenDailyReport";
import createBeneficiaryDailyReports from "../stepReport/createBeneficiaryDailyReports";

import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { beneficiaries as beneficiariesTable, menuPlans } from "@/db/schemas";
import { Beneficiary, DailyReport, MenuPlan } from "../types/domain";
import { CreateMenuPlanInput } from "../types";
import { createAutoDelivery } from "../delivery/delivery.auto.v2.service";

export async function createMenuPlan(
  data: CreateMenuPlanInput,
  kitchenId: string,
  foodItemsIds: string[] = [],
  dates: string[] = []
): Promise<{ dailyReports: DailyReport[]; }> {
  if (!kitchenId) {
    throw new Error("kitchenId is required");
  }

  return await db.transaction(async trx => {
    const beneficiaries: Beneficiary[] = await trx
      .select()
      .from(beneficiariesTable)
      .where(and(eq(beneficiariesTable.kitchenId, kitchenId), eq(beneficiariesTable.status, "AKTIF")));

    const reports: DailyReport[] = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      const exists = await trx.query.menuPlans.findFirst({
        where: and(
          eq(menuPlans.kitchenId, kitchenId),
          eq(menuPlans.planStartDate, dateStr)
        )
      });

      if (exists) {
        continue;
      }

      const plan: MenuPlan = await createPlan(trx, data, kitchenId, date);
      reports.push(plan);

      await attachFoodItems(trx, plan, foodItemsIds);
      await attachBeneficiaries(trx, plan, beneficiaries);

      const kitchenDaily = await createKitchenDailyReport(trx, plan);

      const beneficiaryDaily = await createBeneficiaryDailyReports(trx, plan, beneficiaries);

      const delivery = await createAutoDelivery({
        kitchenId: plan.kitchenId!,
        menuPlanId: plan.id,
        createdBy: plan.createdBy
      }, trx);

    }

    return { dailyReports: reports, };
  });
}
