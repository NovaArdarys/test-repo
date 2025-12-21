// jobs/queue/email.queue.ts
import { Queue } from "bullmq";
import { redisBull } from "@/constants/redis";
import { EmailJob } from "../types/email.type";

export const EMAIL_QUEUE = "email-queue";

export const emailQueue = new Queue<EmailJob>(EMAIL_QUEUE, {
  connection: redisBull,

  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 86400,
    },
  },

  streams: {
    events: { maxLen: 2000 },
  },
});
