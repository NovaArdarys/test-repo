import { Worker, WorkerOptions } from "bullmq";
import { redisBull } from "@/constants/redis";
import { sendAppLog } from "@/messaging/publishers/log.publisher";
import { handleDuplicateJob } from "./safeError";

export function createLoggedWorker<T>(
  queueName: string,
  handler: (job: any) => Promise<void>,
  options?: WorkerOptions
) {
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      const start = performance.now();
      console.log(`🧩 [Worker] Start ${job.name} (${job.id})`);

      try {
        await handler(job);
        const duration = performance.now() - start;
        console.log(`✅ [Worker] Job ${job.name} done in ${duration.toFixed(1)}ms`);

        await sendAppLog("INFO", {
          userId: "system",
          message: `[Worker:${queueName}] Job ${job.name} success`,
          path: queueName,
          ipAddress: "127.0.0.1",
        });
      } catch (error: any) {
        console.error(`💥 [Worker] Job ${job.name} failed:`, error);
        const handled = await handleDuplicateJob(job, error);
        if (handled) return;


        await sendAppLog("ERROR", {
          userId: "system",
          message: `[Worker:${queueName}] Job ${job.name} failed: ${error.message}`,
          path: queueName,
          ipAddress: "127.0.0.1",
        });
      }
    },
    { connection: redisBull, ...options }
  );

  worker.on("completed", (job) => {
    console.log(`🎉 [Worker] Job ${job.name} (${job.id}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`💥 [Worker] Job ${job?.name} (${job?.id}) failed:`, err);
  });

  return worker;
}
