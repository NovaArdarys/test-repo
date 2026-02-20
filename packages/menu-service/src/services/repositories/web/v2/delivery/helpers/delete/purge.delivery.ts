
import { dailyReports, driverLocations } from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";

export async function purgeDelivery(
  trx: any,
  menuPlanId: string
) {
  await trx.delete(dailyReports)
    .where(eq(dailyReports.menuPlanId, menuPlanId));
}
