import { Queue } from 'bullmq';
import redis from '@/constants/redis';
import { stepCommittedSchema } from "@/validator/step.validator";
import z from 'zod';

export const foodQueue = new Queue<z.infer<typeof stepCommittedSchema>>('food-detect-queue', {
  connection: redis
});