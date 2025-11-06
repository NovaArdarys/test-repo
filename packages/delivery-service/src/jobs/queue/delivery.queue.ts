import { Queue } from "bullmq";
import redis from "@/constants/redis";
import { stepCommittedSchema } from "@/types/delivery.type";
import { z } from "zod";

export const DELIVERY_QUEUE_NAME = "delivery";

export const deliveryQueue = new Queue<z.infer<typeof stepCommittedSchema>>(DELIVERY_QUEUE_NAME, {
  connection: redis,
});
