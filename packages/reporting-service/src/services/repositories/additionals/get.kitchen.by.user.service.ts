import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers, beneficiaries } from "@/db/schemas";

export async function getKitchenIdFromDriver(driverId: string): Promise<string> {
  const row = await db.query.drivers.findFirst({
    where: (d, { eq }) => eq(d.id, driverId),
    columns: {
      kitchenId: true,
    },
  });

  if (!row?.kitchenId) {
    throw new Error(`Kitchen not found for driverId: ${driverId}`);
  }

  return row.kitchenId;
}

export async function getKitchenIdFromBeneficiary(
  beneficiaryId: string,
): Promise<string> {
  const row = await db.query.beneficiaries.findFirst({
    where: (b, { eq }) => eq(b.id, beneficiaryId),
    columns: {
      kitchenId: true,
    },
  });

  if (!row?.kitchenId) {
    throw new Error(
      `Kitchen not found for beneficiaryId: ${beneficiaryId}`,
    );
  }

  return row.kitchenId;
}

export async function getKitchenIdFromKitchen(
  userId: string,
): Promise<string> {
  const row = await db.query.userKitchens.findFirst({
    where: (b, { eq }) => eq(b.userId, userId),
    columns: {
      kitchenId: true,
    },
  });

  if (!row?.kitchenId) {
    throw new Error("KitchenId is required");
  }

  return row.kitchenId;
}

export async function resolveKitchenId(params: {
  entityType: "kitchen" | "driver" | "beneficiary";
  entityId: string;
}): Promise<string> {
  const { entityType, entityId } = params;

  console.log(entityType, entityId, "=====ok=====");

  switch (entityType) {
    case "kitchen":
      return getKitchenIdFromKitchen(entityId);

    case "driver":
      return getKitchenIdFromDriver(entityId);

    case "beneficiary":
      return getKitchenIdFromBeneficiary(entityId);

    default:
      throw new Error(`Unsupported entityType: ${entityType}`);
  }
}
