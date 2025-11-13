// services/deliveryConfirmation.service.ts
import { db } from "@/db";
import { deliveries } from "@/db/schemas";
import { eq } from "drizzle-orm";

export async function confirmBeneficiaryDelivery(deliveryId: string, receivedPortion: number, updatedBy: string) {
  const [updated] = await db.update(deliveries)
    .set({
      receivedPortion,
      updatedAt: new Date(),
      updatedBy
    })
    .where(eq(deliveries.id, deliveryId))
    .returning();

  return updated;
}

export async function confirmDriverDelivery(deliveryId: string, takenTray: number, updatedBy: string) {
  const [updated] = await db.update(deliveries)
    .set({
      takenTray,
      updatedAt: new Date(),
      updatedBy
    })
    .where(eq(deliveries.id, deliveryId))
    .returning();

  return updated;
}

