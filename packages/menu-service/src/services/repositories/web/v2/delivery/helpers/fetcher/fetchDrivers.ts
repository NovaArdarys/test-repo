import { drivers } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { Trx, DriverRow } from "../../types/domain";

export default async function fetchDrivers(
  trx: Trx,
  kitchenId: string
): Promise<DriverRow[]> {

  const rows = await trx
    .select()
    .from(drivers)
    .where(eq(drivers.kitchenId, kitchenId));

  return rows satisfies DriverRow[];
}
