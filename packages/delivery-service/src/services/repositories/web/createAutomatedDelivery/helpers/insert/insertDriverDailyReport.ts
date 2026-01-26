import { dailyReports } from "@/db/schemas";
import { format } from "date-fns";

export default async function resolveDriverDailyReport(
  trx: any,
  driver: any,
  menuPlan: any,
  unit: any,
  dailyReportMap: Record<string, Record<string, string>>
): Promise<string> {

  const driverId: string = driver.id;
  const portionType: string = unit.type;

  if (!dailyReportMap[driverId]) {
    dailyReportMap[driverId] = {};
  }

  if (!dailyReportMap[driverId][portionType]) {

    console.log({
      dailyReportMap, driver, unit, data: {
        date: menuPlan.planStartDate,
        entityId: driver.id,
        entityType: "driver",
        menuPlanId: menuPlan.id,
        portionType,
        status: "PENDING",
        createdAt: new Date(),
        createdBy: driver.userId,
      }
    });

    const [dailyReport] = await trx
      .insert(dailyReports)
      .values({
        date: menuPlan.planStartDate,
        entityId: driver.id,
        entityType: "driver",
        menuPlanId: menuPlan.id,
        portionType,
        status: "PENDING",
        createdAt: new Date(),
        createdBy: driver.userId,
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
          updatedBy: driver.userId,
        },
      })
      .returning({ id: dailyReports.id });

    dailyReportMap[driverId][portionType] = dailyReport.id;
  }

  return dailyReportMap[driverId][portionType];
}
