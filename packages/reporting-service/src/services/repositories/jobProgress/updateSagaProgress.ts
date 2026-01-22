import { db } from "@/db";
import { sagaOrchestration } from "@/db/schemas/jobStatus.schema";
import { eq } from "drizzle-orm";

async function updateSagaProgress(sagaId: string) {
  const saga = await db.query.sagaOrchestration.findFirst({
    where: eq(sagaOrchestration.id, sagaId)
  });

  if (!saga) {
    console.warn(`[SAGA] ⚠️ Saga not found: ${sagaId}`);
    return;
  }

  const jobs = await db.query.jobStatus.findMany({
    where: eq(jobStatus.sagaId, sagaId)
  });

  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  const failedJobs = jobs.filter(j => j.status === 'FAILED').length;

  let sagaStatus = saga.status;
  if (completedJobs === saga.totalSteps) {
    sagaStatus = 'COMPLETED';
  } else if (failedJobs > 0) {
    sagaStatus = 'FAILED';
  }

  await db.update(sagaOrchestration)
    .set({
      completedSteps: completedJobs,
      failedSteps: failedJobs,
      status: sagaStatus,
      updatedAt: new Date(),
      completedAt: sagaStatus === 'COMPLETED' ? new Date() : null
    })
    .where(eq(sagaOrchestration.id, sagaId));

  console.log(`[SAGA ${sagaId}] Progress: ${completedJobs}/${saga.totalSteps} (${sagaStatus})`);
}