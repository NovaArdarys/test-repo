import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  drivers,
  beneficiaries,
  userKitchens,
  userBeneficiaries,
} from "@/db/schemas";

type EntityType = "kitchen" | "driver" | "beneficiary";

export async function getListUsersByKitchen(params: {
  kitchenId: string;
  entityTypes?: EntityType[];
}): Promise<string[]> {
  const { kitchenId, entityTypes } = params;

  const targets: EntityType[] =
    entityTypes && entityTypes.length > 0
      ? entityTypes
      : ["kitchen", "driver", "beneficiary"];

  const userIds: string[] = [];

  if (targets.includes("kitchen")) {
    const kitchenUsers = await db
      .select({ userId: userKitchens.userId })
      .from(userKitchens)
      .where(
        and(
          eq(userKitchens.kitchenId, kitchenId),
          eq(userKitchens.isDeleted, false)
        )
      );

    userIds.push(...kitchenUsers.map(u => u.userId));
  }

  if (targets.includes("driver")) {
    const driverUsers = await db
      .select({ userId: drivers.userId })
      .from(drivers)
      .where(
        and(
          eq(drivers.kitchenId, kitchenId),
          eq(drivers.isDeleted, false),
          eq(drivers.isActive, true)
        )
      );

    userIds.push(...driverUsers.map(d => d.userId));
  }

  if (targets.includes("beneficiary")) {
    const beneficiaryUsers = await db
      .select({ userId: userBeneficiaries.userId })
      .from(userBeneficiaries)
      .innerJoin(
        beneficiaries,
        and(
          eq(userBeneficiaries.beneficiaryId, beneficiaries.id),
          eq(beneficiaries.kitchenId, kitchenId)
        )
      )
      .where(
        and(
          eq(userBeneficiaries.isDeleted, false),
          eq(beneficiaries.isDeleted, false),
          eq(beneficiaries.status, "ACTIVE")
        )
      );

    userIds.push(...beneficiaryUsers.map(b => b.userId));
  }

  return Array.from(new Set(userIds));
}
