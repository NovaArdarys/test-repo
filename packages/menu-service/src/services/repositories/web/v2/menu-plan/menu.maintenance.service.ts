import { db } from "@/db";
import {
  menuPlans,
  menuFoodItem,
  menuPlanBeneficiaries,
  foodConsumptionItems,
  foodConsumptionNotes,
  deliveries,
  deliveryBeneficiaries,
  deliveryStepReports,
  dailyReports,
  stepReports,
  suppliersFoodItems,
  jobStatus,
  sagaOrchestration,
  notifications,
  beneficiaryPortions,
  eventReports,
  aiAnalysisLogs,
  servingDetections,
  apdDetections,
  cleanlinessResults,
  driverLocations
} from "@/db/schemas";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Resets menu-related transactional data.
 * @param menuPlanId If provided, only resets data for this specific menu plan.
 *                   If omitted, performs a global reset of all transactional data.
 */
export async function resetMenuData(menuPlanId?: string): Promise<{ success: boolean; message: string; }> {
  return await db.transaction(async (trx) => {
    try {
      console.log(`[MAINTENANCE] Resetting Menu Data ${menuPlanId ? `for Plan: ${menuPlanId}` : "Globally"}...`);

      if (menuPlanId) {
        // 1. Fetch related IDs for tables that don't have direct menu_plan_id but link through other tables
        const dailyReportResults = await trx
          .select({ id: dailyReports.id })
          .from(dailyReports)
          .where(eq(dailyReports.menuPlanId, menuPlanId));
        const dailyReportIds = dailyReportResults.map(r => r.id);

        const stepReportResults = dailyReportIds.length > 0 ? await trx
          .select({ id: stepReports.id })
          .from(stepReports)
          .where(inArray(stepReports.dailyReportId, dailyReportIds)) : [];
        const stepReportIds = stepReportResults.map(r => r.id);

        const deliveryBeneficiaryResults = await trx
          .select({ 
            id: deliveryBeneficiaries.id,
            deliveryId: deliveryBeneficiaries.deliveryId 
          })
          .from(deliveryBeneficiaries)
          .where(eq(deliveryBeneficiaries.menuPlanId, menuPlanId));
        
        const deliveryBeneficiaryIds = deliveryBeneficiaryResults.map(r => r.id);
        const deliveryIds = [...new Set(deliveryBeneficiaryResults.map(r => r.deliveryId))].filter(Boolean) as string[];

        // Fetch saga IDs from jobStatus to cleanup orchestration state
        const jobStatusResults = await trx
          .select({ sagaId: jobStatus.sagaId })
          .from(jobStatus)
          .where(
            and(
              eq(jobStatus.entityId, menuPlanId),
              eq(jobStatus.entityType, 'menu_plan')
            )
          );
        const sagaIds = [...new Set(jobStatusResults.map(r => r.sagaId))].filter(Boolean) as string[];

        // 2. Delete downstream dependent data (AI, Logistics, etc.)
        
        // AI Side-effects
        if (stepReportIds.length > 0) {
          await trx.delete(servingDetections).where(inArray(servingDetections.stepReportId, stepReportIds));
          await trx.delete(apdDetections).where(inArray(apdDetections.stepReportId, stepReportIds));
          await trx.delete(cleanlinessResults).where(inArray(cleanlinessResults.stepReportId, stepReportIds));
        }

        if (dailyReportIds.length > 0 || stepReportIds.length > 0) {
          const aiEntityIds = [...dailyReportIds, ...stepReportIds];
          await trx.delete(aiAnalysisLogs).where(inArray(aiAnalysisLogs.entityId, aiEntityIds));
        }

        // Logistics Side-effects
        if (deliveryIds.length > 0) {
          await trx.delete(driverLocations).where(inArray(driverLocations.deliveryId, deliveryIds));
          await trx.delete(deliveries).where(inArray(deliveries.id, deliveryIds));
        }

        if (deliveryBeneficiaryIds.length > 0) {
          await trx.delete(deliveryStepReports).where(inArray(deliveryStepReports.deliveryBeneficiaryId, deliveryBeneficiaryIds));
          await trx.delete(deliveryBeneficiaries).where(eq(deliveryBeneficiaries.menuPlanId, menuPlanId));
        }

        if (dailyReportIds.length > 0) {
          if (stepReportIds.length > 0) {
            await trx.delete(stepReports).where(inArray(stepReports.id, stepReportIds));
          }
          await trx.delete(dailyReports).where(eq(dailyReports.menuPlanId, menuPlanId));
        }

        // 3. Delete direct associations
        await trx.delete(eventReports).where(
          and(
            eq(eventReports.entityType, 'menu_plan'),
            eq(eventReports.entityId, menuPlanId)
          )
        );

        await trx.delete(foodConsumptionItems).where(eq(foodConsumptionItems.menuPlanId, menuPlanId));
        await trx.delete(foodConsumptionNotes).where(eq(foodConsumptionNotes.menuPlanId, menuPlanId));
        await trx.delete(suppliersFoodItems).where(eq(suppliersFoodItems.menuPlanId, menuPlanId));
        await trx.delete(beneficiaryPortions).where(eq(beneficiaryPortions.menuPlanId, menuPlanId));
        await trx.delete(menuPlanBeneficiaries).where(eq(menuPlanBeneficiaries.menuPlanId, menuPlanId));
        await trx.delete(menuFoodItem).where(eq(menuFoodItem.menuFoodPlanId, menuPlanId));

        // Cleanup orchestration and job status
        // Since jobStatus has onDelete: 'cascade' from sagaOrchestration, we delete sagas first
        if (sagaIds.length > 0) {
          await trx.delete(sagaOrchestration).where(inArray(sagaOrchestration.id, sagaIds));
        }

        // Cleanup any remaining job status tracking not tied to a saga
        await trx.delete(jobStatus).where(
          and(
            eq(jobStatus.entityId, menuPlanId),
            eq(jobStatus.entityType, 'menu_plan')
          )
        );

        // Cleanup notifications (jsonb check)
        await trx.delete(notifications).where(sql`payload->>'menuPlanId' = ${menuPlanId}`);

        // 4. Finally delete the plan itself
        await trx.delete(menuPlans).where(eq(menuPlans.id, menuPlanId));

      } else {
        await trx.delete(aiAnalysisLogs);
        await trx.delete(servingDetections);
        await trx.delete(apdDetections);
        await trx.delete(cleanlinessResults);

        await trx.delete(deliveryStepReports);
        await trx.delete(deliveryBeneficiaries);
        await trx.delete(driverLocations);
        await trx.delete(deliveries);

        await trx.delete(stepReports);
        await trx.delete(dailyReports);
        await trx.delete(eventReports);

        await trx.delete(foodConsumptionItems);
        await trx.delete(foodConsumptionNotes);

        await trx.delete(suppliersFoodItems);
        await trx.delete(beneficiaryPortions);
        await trx.delete(menuPlanBeneficiaries);
        await trx.delete(menuFoodItem);
        await trx.delete(menuPlans);

        await trx.delete(jobStatus);
        await trx.delete(sagaOrchestration);

        await trx.delete(notifications);
      }

      console.log("[MAINTENANCE] Menu Data Reset Successfully.");

      return {
        success: true,
        message: menuPlanId
          ? `Transactional data for menu plan ${menuPlanId} has been reset.`
          : "All menu-related transactional data has been reset."
      };
    } catch (error) {
      console.error("[MAINTENANCE] Error resetting menu data:", error);
      trx.rollback();
      throw error;
    }
  });
}
