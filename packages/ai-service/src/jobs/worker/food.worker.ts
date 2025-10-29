import redis from '@/constants/redis';
import { detectFood } from '@/services/clients/ai.service';
import { DetectFoodInput } from '@/validator/food.validator';
import { Worker } from 'bullmq';

export const foodWorker = new Worker<DetectFoodInput>(
  'food-detect-queue',
  async (job) => {
    console.log(`[Worker] Processing job ${job.id}`);
    const result = await detectFood(job.data);
    console.log(`[Worker] Completed job ${job.id}`);
    return result;
  },
  { connection: redis }
);

foodWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});
