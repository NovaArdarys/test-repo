import { Queue } from "bullmq";
import redis from "@/constants/redis";
import { dropoffJobSchema } from "@/types/delivery.type";
import { z } from "zod";

export const DELIVERY_QUEUE_NAME = "delivery";

export const deliveryQueue = new Queue(DELIVERY_QUEUE_NAME, {
  connection: redis,
});
