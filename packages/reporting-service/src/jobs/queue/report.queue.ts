import { Queue } from "bullmq";
import { redisBull } from "@/constants/redis";
import type { ReportQueueType } from "@/jobs/types/report.type";

export const REPORT_QUEUE = "report";

export const reportQueue = new Queue<ReportQueueType>(REPORT_QUEUE, {
  connection: redisBull,

  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: {
      age: 3600,
      count: 1000
    },
    removeOnFail: {
      age: 86400
    },
  },

  // group control
  streams: {
    events: {
      maxLen: 10000,
    },
  },
});
