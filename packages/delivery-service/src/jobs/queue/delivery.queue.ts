import { Queue } from "bullmq";
import redis from "@/constants/redis";

export const DELIVERY_QUEUE_NAME = "delivery";

export const deliveryQueue = new Queue(DELIVERY_QUEUE_NAME, {
  connection: redis,
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
