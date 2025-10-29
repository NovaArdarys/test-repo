import { Queue } from 'bullmq';
import redis from '@/constants/redis.js';
import { DetectFoodInput } from '@/validator/food.validator';
import { StorageCommittedType } from '@/validator/storage.validator';

export const foodQueue = new Queue<StorageCommittedType>('food-detect-queue', {
  connection: redis
});