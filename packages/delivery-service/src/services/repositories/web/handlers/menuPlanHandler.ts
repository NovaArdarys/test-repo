// delivery-service/src/services/handlers/menuPlanHandler.ts
import { db } from "@/db";
import { jobStatus, sagaOrchestration } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { publishDeliveryEvent } from "@/messaging/publishers/delivery.publisher";
import { createAutoDelivery } from "../createAutomatedDelivery/delivery.auto.v2.service";
import { updateSagaProgress } from "../jobProgress/updateSagaProgress";

interface MenuPlanCreatedEvent {
  sagaId: string;
  jobId: string;
  menuPlanId: string;
  kitchenId: string;
  planStartDate?: string;
  createdBy?: string;
  eventType: string;
  _meta?: {
    eventId?: string;
    timestamp?: string;
  };
}

export async function handleMenuPlanCreated(data: MenuPlanCreatedEvent) {
  const { sagaId, jobId, menuPlanId, kitchenId, createdBy } = data;

  try {
    await db.update(jobStatus)
      .set({
        status: 'PROCESSING',
        startedAt: new Date(),
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

      await publishDeliveryEvent("delivery.failed", {
        sagaId,
        jobId,
        menuPlanId,
        kitchenId,
        status: 'FAILED',
        error: {
          message: error.message,
        },
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });
    }

    throw error;
  }
}