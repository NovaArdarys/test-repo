import { dailyReports } from "@/db/schemas";
import { format } from "date-fns";

export default async function resolveDriverDailyReport(
  trx: any,
  args: any,
  driver: any,
  unit: any,
  dailyReportMap: Record<string, Record<string, string>>
): Promise<string> {

  const driverId: string = args.driver.id;
  const portionType: string = unit.type;

  if (!dailyReportMap[driverId]) {
    dailyReportMap[driverId] = {};
  }

  if (!dailyReportMap[driverId][portionType]) {

    const [dailyReport] = await trx
      .insert(dailyReports)
      .values({
        date: unit.date || format(new Date(), "yyyy-MM-dd"),
        entityId: driver.id,
        entityType: "driver",
        menuPlanId: unit.menuPlanId,
        portionType,
        status: "PENDING",
        createdAt: new Date(),
        createdBy: args.driver.userId,
      })
      .onConflictDoUpdate({
        target: [
          dailyReports.entityType,
          dailyReports.entityId,
          dailyReports.menuPlanId,
          dailyReports.date,
          dailyReports.portionType,
        ],
        set: {
          updatedAt: new Date(),
          updatedBy: args.driver.userId,
        },
      })
      .returning({ id: dailyReports.id });

    dailyReportMap[driverId][portionType] = dailyReport.id;
  }

  return dailyReportMap[driverId][portionType];
}
