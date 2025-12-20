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

export async function confirmDriverDelivery({
  deliveryId,
  deliveredPortion,
  takenTray,
  updatedBy,
}: {
  deliveryId: string;
  deliveredPortion?: number;
  takenTray?: number;
  updatedBy: string;
}) {
  const updatePayload: any = {
    updatedAt: new Date(),
    updatedBy,
  };

  if (typeof deliveredPortion === 'number') {
    updatePayload.deliverPortion = deliveredPortion;
  }

  if (typeof takenTray === 'number') {
    updatePayload.takenTray = takenTray;
  }

  const [updated] = await db.update(deliveries)
    .set(updatePayload)
    .where(eq(deliveries.id, deliveryId))
    .returning();

  return updated;
}



