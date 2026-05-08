import { db } from "@/db";
import { deliveries, deliveryBeneficiaries, deliveryStepReports, drivers, stepReports, dailyReports, menuPlans, driverLocations } from "@/db/schemas";
import { eq, and, inArray, sql } from "drizzle-orm";
import resolveDriverDailyReport from "./helpers/insert/insertDriverDailyReport";
import insertDriverStepReports from "./helpers/insert/insertDriverStepReports";
import { getStepTemplate } from "./helpers/driverSteps";

export async function overrideDriverForBeneficiary(
  menuPlanId: string,
  beneficiaryId: string,
  newDriverUserId: string,
  authorUserId: string,
  oldDriverUserId?: string
) {
  return await db.transaction(async (trx) => {
    // 0. Get Menu Plan Info (for accurate date)
    const [menuPlan] = await trx
      .select({ date: menuPlans.planStartDate })
      .from(menuPlans)
      .where(eq(menuPlans.id, menuPlanId));

    if (!menuPlan) {
      throw new Error("Menu plan tidak ditemukan.");
    }

    // 1. Get New Driver Profile
    const [driverProfile] = await trx
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.userId, newDriverUserId));

    if (!driverProfile) {
      throw new Error("Profil driver tidak ditemukan untuk user ini.");
    }
    const newDriverId = driverProfile.id;

    let oldDriverId: string | undefined;
    if (oldDriverUserId) {
      const [oldProfile] = await trx
        .select({ id: drivers.id })
        .from(drivers)
        .where(eq(drivers.userId, oldDriverUserId));
      oldDriverId = oldProfile?.id;
    }

    // 2. Get Affected Deliveries for this beneficiary
    const dbs = await trx
      .select({
        id: deliveryBeneficiaries.id,
        deliveryId: deliveryBeneficiaries.deliveryId,
      })
      .from(deliveryBeneficiaries)
      .innerJoin(deliveries, eq(deliveries.id, deliveryBeneficiaries.deliveryId))
      .where(
        and(
          eq(deliveryBeneficiaries.menuPlanId, menuPlanId),
          eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId),
          eq(deliveryBeneficiaries.isDeleted, false),
          oldDriverId ? eq(deliveries.driverId, oldDriverId) : undefined
        )
      );

    if (!dbs.length) {
      throw new Error("Data pengiriman tidak ditemukan untuk kriteria ini.");
    }

    const deliveryIds = dbs.map((db) => db.deliveryId);

    // 2c. Capacity Validation (Per Trip)
    const [newDriverDetails] = await trx
      .select({ portionCapacity: drivers.portionCapacity })
      .from(drivers)
      .where(eq(drivers.id, newDriverId));
    
    const capacity = newDriverDetails?.portionCapacity || 0;

    const deliveriesToValidate = await trx
      .select({ 
        targetPortion: deliveries.targetPortion,
        portionType: deliveries.portionType 
      })
      .from(deliveries)
      .where(and(
         inArray(deliveries.id, deliveryIds),
         eq(deliveries.isDeleted, false)
      ));

    for (const deliv of deliveriesToValidate) {
      if (deliv.targetPortion > capacity) {
        throw new Error(`Porsi pengiriman (${deliv.targetPortion}) melebihi kapasitas driver baru (${capacity}).`);
      }
    }

    // 2d. Unique Visit Validation (Anti-Repeat)
    // Check if new driver already has an assignment for this school + portion types in the same cycle
    const affectedPortionTypes = [...new Set(deliveriesToValidate.map(d => d.portionType).filter(Boolean))];
    
    if (affectedPortionTypes.length > 0) {
      const existingSamePortion = await trx
        .select({ id: deliveries.id })
        .from(deliveries)
        .innerJoin(deliveryBeneficiaries, eq(deliveries.id, deliveryBeneficiaries.deliveryId))
        .where(
          and(
            eq(deliveries.driverId, newDriverId),
            eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId),
            eq(deliveryBeneficiaries.menuPlanId, menuPlanId),
            inArray(deliveries.portionType, affectedPortionTypes as string[]),
            eq(deliveries.isDeleted, false)
          )
        );
      
      if (existingSamePortion.length > 0) {
        throw new Error(`Driver baru sudah memiliki penugasan porsi yang sama untuk sekolah ini di rute lain. Aturan: 1 driver maksimal 1 porsi kecil dan 1 porsi besar per sekolah.`);
      }
    }

    // 2b. Identify old daily reports for cleanup later
    const oldStepReports = await trx
      .select({ dailyReportId: stepReports.dailyReportId })
      .from(deliveryStepReports)
      .innerJoin(stepReports, eq(stepReports.id, deliveryStepReports.stepId))
      .where(inArray(deliveryStepReports.deliveryBeneficiaryId, dbs.map(db => db.id)));
    
    const potentialEmptyDailyReportIds = [...new Set(oldStepReports.map(s => s.dailyReportId))];

    // 3. Get detailed delivery info to handle portionTypes
    const affectedDeliveries = await trx
      .select({
        id: deliveries.id,
        portionType: deliveries.portionType,
        type: deliveries.type,
        kitchenId: deliveries.kitchenId,
      })
      .from(deliveries)
      .where(inArray(deliveries.id, deliveryIds));

    const portionTypes = [...new Set(affectedDeliveries.map(d => d.portionType || "DEFAULT"))];

    // 4. Resolve Daily & Step Reports for New Driver
    const dailyReportMap: Record<string, string> = {}; 
    const stepReportsMap: Record<string, any> = {};    

    const mockArgs = {
      driver: { id: newDriverId, userId: authorUserId },
      kitchen: { id: affectedDeliveries[0].kitchenId },
      menuPlan: { id: menuPlanId }
    };

    for (const pt of portionTypes) {
      const dailyReportId = await resolveDriverDailyReport(
        trx,
        mockArgs,
        { id: newDriverId },
        { type: pt, menuPlanId, date: menuPlan.date },
        {} 
      );
      dailyReportMap[pt] = dailyReportId;

      let steps = await trx
        .select()
        .from(stepReports)
        .where(eq(stepReports.dailyReportId, dailyReportId));

      if (steps.length === 0) {
        const insertedSteps = await insertDriverStepReports(trx, mockArgs, dailyReportId);
        stepReportsMap[dailyReportId] = insertedSteps;
      } else {
        const stepTemplate = await getStepTemplate("driver");
        stepReportsMap[dailyReportId] = steps.map(s => ({
          stepReportId: s.id,
          stepKey: stepTemplate.find(t => t.id === s.stepId)?.stepKey
        }));
      }
    }

    // 5. Update Deliveries driverId
    await trx
      .update(deliveries)
      .set({ driverId: newDriverId, updatedBy: authorUserId, updatedAt: new Date() })
      .where(inArray(deliveries.id, deliveryIds));

    // 5b. Update Driver Locations (Tracking consistency)
    await trx
      .update(driverLocations)
      .set({ driverId: newDriverId })
      .where(inArray(driverLocations.deliveryId, deliveryIds));

    // 6. Update Delivery Step Reports
    for (const dRec of affectedDeliveries) {
      const pt = dRec.portionType || "DEFAULT";
      const dailyReportId = dailyReportMap[pt];
      const newSteps = stepReportsMap[dailyReportId];

      const targetStepKey = dRec.type === "PICKUP" ? "pickup" : "delivery";
      const newStepReport = newSteps.find((s: any) => s.stepKey === targetStepKey);

      if (newStepReport) {
        const relatedDbIds = dbs.filter(db => db.deliveryId === dRec.id).map(db => db.id);
        
        if (relatedDbIds.length > 0) {
          await trx
            .update(deliveryStepReports)
            .set({ stepId: newStepReport.stepReportId })
            .where(inArray(deliveryStepReports.deliveryBeneficiaryId, relatedDbIds));
        }
      }
    }

    // 7. Cleanup empty daily reports for the old driver
    for (const drId of potentialEmptyDailyReportIds) {
      const remainingTasks = await trx
        .select({ count: sql`count(*)` })
        .from(deliveryStepReports)
        .innerJoin(stepReports, eq(stepReports.id, deliveryStepReports.stepId))
        .where(eq(stepReports.dailyReportId, drId));

      const count = Number(remainingTasks[0]?.count || 0);
      if (count === 0) {
        // No more tasks linked to this daily report, delete it
        await trx.delete(dailyReports).where(eq(dailyReports.id, drId));
      }
    }

    return true;
  });
}

