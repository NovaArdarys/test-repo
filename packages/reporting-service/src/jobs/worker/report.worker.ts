// jobs/worker/menuplan.worker.ts
import { Worker } from "bullmq";
import { redisBull } from "@/constants/redis";
import { REPORT_QUEUE } from "../queue/report";
import { ReportQueueSchema } from "@/jobs/types/report.type";
import { handleMenuPlanCreated } from "@/services/repositories/web/v1/createReport/createReport";

export const reportWorker = new Worker(
  REPORT_QUEUE,
  async (job) => {
    try {
      console.log("▶️ MenuPlan Worker processing:", job.name, job.data);

      const input = ReportQueueSchema.parse(job.data);

      if (input.type === "create") {
        await handleMenuPlanCreated(input.data);
      }

      if (input.type === "update") {

      }

      return { skipped: true };

    } catch (error: any) {

      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        await job.remove();
        return { skipped: true };
      }

      if (job.attemptsMade < job.opts.attempts!) {
        throw error;
      }

      throw error;
    }
  },
  {
    connection: redisBull,
    concurrency: 3,
    lockDuration: 90000,
    autorun: true,
    maxStalledCount: 2,
    stalledInterval: 60000,
  }
);


reportWorker.on("error", err => console.error("worker error:", err));
reportWorker.on("failed", err => console.error("worker failed:", err));
reportWorker.on("closed", () => console.log("worker closed"));
reportWorker.on("active", job => console.log("active:", job.id));
reportWorker.on("completed", job => console.log("completed:", job.id));