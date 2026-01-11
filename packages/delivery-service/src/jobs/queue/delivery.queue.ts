import { Queue } from "bullmq";
import redis from "@/constants/redis";

export const DELIVERY_QUEUE_NAME = "delivery";

export const deliveryQueue = new Queue(DELIVERY_QUEUE_NAME, {
  connection: redis,
});
