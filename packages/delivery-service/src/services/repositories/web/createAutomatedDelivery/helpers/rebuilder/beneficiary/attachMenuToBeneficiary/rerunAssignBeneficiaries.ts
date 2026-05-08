// services/menuPlan/rerunAssignBeneficiaries.ts
import { db } from "@/db";
import { and, eq, or, isNull, sql } from "drizzle-orm";
import {
  beneficiaries as beneficiariesTable,
  menuPlans,
  userBeneficiaries,
} from "@/db/schemas";
import attachBeneficiaries from "./attachBeneficiaries";
import { Beneficiary } from "../../../../types/domain";

type BeneficiaryWithUsers = Beneficiary & { users: string[]; };

export async function rerunAssignBeneficiaries(menuPlanId: string) {
  const plan = await db.query.menuPlans.findFirst({
    where: eq(menuPlans.id, menuPlanId),
  });

  if (!plan) throw new Error(`Menu plan ${menuPlanId} not found`);

  console.log(`[RERUN] Assigning beneficiaries to plan ${menuPlanId} (${plan.planStartDate})`);

  await db.transaction(async (trx) => {
    // Fetch beneficiaries aktif dari kitchen yang sama
    const beneficiariesWithUsers = await trx
      .select({
        id: beneficiariesTable.id,
        name: beneficiariesTable.name,
        kitchenId: beneficiariesTable.kitchenId,
        address: beneficiariesTable.address,
        category: beneficiariesTable.category,
        phoneNumber: beneficiariesTable.phoneNumber,
        lon: beneficiariesTable.lon,
        lat: beneficiariesTable.lat,
        provinceId: beneficiariesTable.provinceId,
        regencyId: beneficiariesTable.regencyId,
        districtId: beneficiariesTable.districtId,
        villageId: beneficiariesTable.villageId,
        storageId: beneficiariesTable.storageId,
        imageUrl: beneficiariesTable.imageUrl,
        isDeleted: beneficiariesTable.isDeleted,
        joinedDate: beneficiariesTable.joinedDate,
        smallPortion: beneficiariesTable.smallPortion,
        largePortion: beneficiariesTable.largePortion,
        smallDeliveryTime: beneficiariesTable.smallDeliveryTime,
        largeDeliveryTime: beneficiariesTable.largeDeliveryTime,
        status: beneficiariesTable.status,
        createdAt: beneficiariesTable.createdAt,
        createdBy: beneficiariesTable.createdBy,
        updatedAt: beneficiariesTable.updatedAt,
        updatedBy: beneficiariesTable.updatedBy,
        userId: userBeneficiaries.userId,
      })
      .from(beneficiariesTable)
      .innerJoin(
        userBeneficiaries,
        and(
          eq(userBeneficiaries.beneficiaryId, beneficiariesTable.id),
          eq(userBeneficiaries.isDeleted, false)
        )
      )
      .where(
        and(
          eq(beneficiariesTable.kitchenId, plan.kitchenId!),
          or(eq(beneficiariesTable.isDeleted, false), isNull(beneficiariesTable.isDeleted)),
          or(
            eq(sql`LOWER(${beneficiariesTable.status}::text)`, 'active'),
            eq(sql`LOWER(${beneficiariesTable.status}::text)`, 'aktif'),
            isNull(beneficiariesTable.status)
          )
        )
      );

    if (!beneficiariesWithUsers.length) {
      throw new Error(`No active beneficiaries found for kitchen ${plan.kitchenId}`);
    }

    const beneficiaries: BeneficiaryWithUsers[] = beneficiariesWithUsers.reduce(
      (acc, row) => {
        const { userId, ...beneficiary } = row;
        const existing = acc.find((b) => b.id === beneficiary.id);
        if (existing) {
          existing.users.push(userId);
        } else {
          acc.push({ ...beneficiary, users: [userId] });
        }
        return acc;
      },
      [] as BeneficiaryWithUsers[]
    );

    console.log(`[RERUN] Found ${beneficiaries.length} beneficiaries`);

    // attachBeneficiaries sudah handle upsert/skip duplicate
    await attachBeneficiaries(trx, plan, beneficiaries);

    console.log(`[RERUN] Done — ${beneficiaries.length} beneficiaries assigned to plan ${menuPlanId}`);
  });

  return { menuPlanId, assigned: true };
}