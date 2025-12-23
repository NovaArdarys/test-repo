import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drivers, beneficiaries, kitchens, userKitchens } from "@/db/schemas";

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
  kitchenId: string,
): Promise<string> {
  const row = await db.query.userKitchens.findFirst({
    where: (b, { eq }) => eq(b.kitchenId, kitchenId),
    columns: {
      kitchenId: true,
    },
  });

  if (!row?.kitchenId) {
    throw new Error("KitchenId is required");
  }

  return row.kitchenId;
}

export async function getKitchenDetailByUsers(
  kitchenIds: string[],
) {

  const rows = await db
    .select({
      id: kitchens.id,
      name: kitchens.name,
      address: kitchens.address,
      status: kitchens.status,
      phoneNumber: kitchens.phoneNumber,
      imageURL: kitchens.imageURL,
      storageId: kitchens.storageId,
    })
    .from(kitchens)
    .innerJoin(userKitchens, eq(userKitchens.kitchenId, kitchens.id))
    .where(
      inArray(userKitchens.kitchenId, kitchenIds)
    );

  if (!rows.length) {
    throw new Error("Kitchen not found");
  }

  return rows?.[0] ?? null;
}


export async function resolveKitchenId(params: {
  entityType: "kitchen" | "driver" | "beneficiary";
  entityId: string;
}): Promise<string> {
  const { entityType, entityId } = params;

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
