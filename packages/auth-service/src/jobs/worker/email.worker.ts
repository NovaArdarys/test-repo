// jobs/worker/email.worker.ts
import { Worker } from "bullmq";
import { redisBull } from "@/constants/redis";
import { EMAIL_QUEUE } from "../queue/email.queue";
import { emailJobSchema } from "@/jobs/types/email.type";
import { sendEmail } from "@/services/repositories/email/email.service";

export const emailWorker = new Worker(
  EMAIL_QUEUE,
  async (job) => {
    try {
      console.log("📨 Email Worker running:", job.name, job.data);

      const input = emailJobSchema.parse(job.data);

      const result = await sendEmail(input);

      return { status: "sent", result };

    } catch (err: any) {
      console.log(err);

      if (job.attemptsMade < job.opts.attempts!) {
        throw err;
      }

      console.error("💥 Email job dead:", err);
      throw err;
    }
  },
  {
    connection: redisBull,
    concurrency: 5,
    lockDuration: 60000,
    autorun: true,
    maxStalledCount: 3,
    stalledInterval: 30000,
  }
);

emailWorker.on("failed", (job, err) => {
  console.error("❌ Email job failed:", job?.id, err);
});

emailWorker.on("completed", (job) => {
  console.log("✅ Email job completed:", job.id);
});
