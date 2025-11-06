import { Worker, WorkerOptions, Job } from "bullmq";
import redis from "@/constants/redis";
import { sendAppLog } from "@/messaging/publishers/log.publisher";

export function createLoggedWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: WorkerOptions
) {
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      const startTime = performance.now();
      await sendAppLog("INFO", {
        userId: "system",
        message: `🚀 Worker started: ${queueName} | Job ${job.name} (${job.id})`,
        path: `worker.${queueName}`,
        ipAddress: "",
      });

      try {
        await processor(job);

        const duration = (performance.now() - startTime).toFixed(2);
        await sendAppLog("INFO", {
          userId: "system",
          message: `Worker success: ${queueName} | Job ${job.name} (${job.id}) | ${duration}ms`,
          path: `worker.${queueName}`,
          ipAddress: "",
        });
      } catch (error: any) {
        await sendAppLog("ERROR", {
          userId: "system",
          message: `Worker failed: ${queueName} | Job ${job.name} (${job.id}) | ${error.message}`,
          path: `worker.${queueName}`,
          ipAddress: "",
        });
        throw error;
      }
    },
    {
      connection: redis,
      ...options,
    }
  );

  worker.on("failed", async (job, err) => {
    await sendAppLog("ERROR", {
      userId: "system",
      message: `Job failed: ${queueName} | ${job?.name} (${job?.id}) | ${err.message}`,
      path: `worker.${queueName}`,
      ipAddress: "",
    });
  });

  worker.on("completed", async (job) => {
    await sendAppLog("INFO", {
      userId: "system",
      message: `Job completed: ${queueName} | ${job.name} (${job.id})`,
      path: `worker.${queueName}`,
      ipAddress: "",
    });
  });

  return worker;
}
