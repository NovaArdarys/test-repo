import { kitchens } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { Trx, KitchenRow } from "../types/domain";

export default async function fetchKitchen(
  trx: Trx,
  kitchenId: string
): Promise<KitchenRow> {
  const [kitchen] = await trx
    .select()
    .from(kitchens)
    .where(eq(kitchens.id, kitchenId));

  if (!kitchen) {
    throw new Error("Kitchen not found");
  }

  return kitchen satisfies KitchenRow;
}
