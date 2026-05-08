// delivery-service/src/services/handlers/menuPlanHandler.ts
import { db } from "@/db";
import { jobStatus, sagaOrchestration } from "@/db/schemas";
import { eq, sql } from "drizzle-orm";
import { publishDeliveryEvent } from "@/messaging/publishers/delivery.publisher";
import { createAutoDelivery } from "../createAutomatedDelivery/delivery.auto.v2.service";
import { updateSagaProgress } from "../jobProgress/updateSagaProgress";
import { MenuPlanCreatedEventType } from "@/jobs/types/report.type";

export async function handleMenuPlanCreated(data: MenuPlanCreatedEventType) {
  const { sagaId, jobId, menuPlanId, kitchenId, createdBy } = data;

  console.log(data, "=====data=====");


  try {
    const existingJob = await db.query.jobStatus.findFirst({
      where: eq(jobStatus.id, jobId)
    });

    console.log("====existingJob:====", existingJob);
    await db.update(jobStatus)
      .set({
        status: 'PROCESSING',
        startedAt: new Date(),
        attemptCount: sql`${jobStatus.attemptCount} + 1`,
      })
      .where(eq(jobStatus.id, jobId));

    const delivery = await createAutoDelivery({
      kitchenId,
      menuPlanId,
      createdBy: createdBy || 'system',
    });

    await db.update(jobStatus)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(jobStatus.id, jobId));

    await updateSagaProgress(sagaId);

    await publishDeliveryEvent("delivery.created", {
      sagaId,
      jobId,
      menuPlanId,
      kitchenId,
      status: 'SUCCESS',
      _meta: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    const jobRecord = await db.query.jobStatus.findFirst({
      where: eq(jobStatus.id, jobId)
    });

    const isMaxAttempts = jobRecord
      ? jobRecord.attemptCount >= (jobRecord.maxAttempts ?? 3)
      : false;

    await db.update(jobStatus)
      .set({
        status: isMaxAttempts ? 'FAILED' : 'PENDING',
        failedAt: new Date(),
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }
      })
      .where(eq(jobStatus.id, jobId));

    if (isMaxAttempts) {
      await db.update(sagaOrchestration)
        .set({
          status: 'FAILED',
          failedSteps: sql`${sagaOrchestration.failedSteps} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(sagaOrchestration.id, sagaId));

      await publishDeliveryEvent("delivery.failed", {
        sagaId,
        jobId,
        menuPlanId,
        kitchenId,
        status: 'FAILED',
        error: { message: error.message },
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });
    }

    throw error;
  }
}