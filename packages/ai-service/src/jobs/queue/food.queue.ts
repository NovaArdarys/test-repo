import { Queue } from 'bullmq';
import redis from '@/constants/redis.js';
import { DetectFoodInput } from '@/validator/food.validator';

export const foodQueue = new Queue<DetectFoodInput>('food-detect-queue', {
  connection: redis
});