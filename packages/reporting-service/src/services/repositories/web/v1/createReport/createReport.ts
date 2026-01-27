// report-service/src/services/repositories/web/v1/createReport/createReport.ts
import { db } from "@/db";
import { jobStatus, menuPlans, sagaOrchestration } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { EXCHANGES } from "@/messaging/events/exchanges";
import createKitchenDailyReport from "./createKitchenDailyReport";
import createBeneficiaryDailyReports from "./createBeneficiaryDailyReports";
import { updateSagaProgress } from "@/services/repositories/jobProgress/updateSagaProgress";
import { publishReportEvent } from "@/messaging/publishers/reporting.publisher";
import { MenuPlanCreatedEventType } from "@/jobs/types/report.type";

export async function handleMenuPlanCreated(data: MenuPlanCreatedEventType) {
  const { sagaId, jobId, menuPlanId, kitchenId, beneficiaries = [] } = data;

  try {
    await db.update(jobStatus)
      .set({
        status: 'PROCESSING',
        startedAt: new Date(),
      })
      .where(eq(jobStatus.id, jobId));

    const result = await db.transaction(async trx => {
      const menuPlan = await trx.query.menuPlans.findFirst({
        where: eq(menuPlans.id, menuPlanId)
      });

      if (!menuPlan) {
        throw new Error(`Menu plan not found: ${menuPlanId}`);
      }

      const kitchenDaily = await createKitchenDailyReport(trx, menuPlan);
      console.log(`[JOB ${jobId}] ✅ Kitchen report created: ${kitchenDaily.id}`);

      const beneficiaryDaily = await createBeneficiaryDailyReports(
        trx,
        menuPlan,
        beneficiaries.length > 0 ? beneficiaries : []
      );
      console.log(`[JOB ${jobId}] ✅ Beneficiary reports created: ${beneficiaryDaily.length}`);

      return {
        kitchenDaily,
        beneficiaryDaily,
        totalReports: 1 + beneficiaryDaily.length
      };
    });

    await db.update(jobStatus)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          kitchenDailyReportId: result.kitchenDaily.id,
          beneficiaryReportsCount: result.beneficiaryDaily.length,
          totalReports: result.totalReports,
        }
      })
      .where(eq(jobStatus.id, jobId));

    await updateSagaProgress(sagaId);

    await publishReportEvent('report.created', {
      sagaId,
      jobId,
      menuPlanId,
      kitchenId,
      status: 'SUCCESS',
      result: {
        kitchenDailyReportId: result.kitchenDaily.id,
        beneficiaryReportsCount: result.beneficiaryDaily.length,
      },
    });

  } catch (error: any) {
    await db.update(jobStatus)
      .set({
        status: 'FAILED',
        failedAt: new Date(),
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          errorRaw: error
        }
      })
      .where(eq(jobStatus.id, jobId));

    const jobRecord = await db.query.jobStatus.findFirst({
      where: eq(jobStatus.id, jobId)
    });

    if (jobRecord && jobRecord.attemptCount >= (jobRecord.maxAttempts || 3)) {
      await db.update(sagaOrchestration)
        .set({
          status: 'FAILED',
          failedSteps: (await db.$count(sagaOrchestration.failedSteps)) + 1,
          updatedAt: new Date(),
        })
        .where(eq(sagaOrchestration.id, sagaId));
    }

    throw error;
  }
}