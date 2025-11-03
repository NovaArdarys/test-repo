import { Queue } from 'bullmq';
import redis from '@/constants/redis';
import { StorageClientCommittedType, } from '@/validator/storage.validator';

export const storageQueue = new Queue<StorageClientCommittedType>('storage-client-queue', {
  connection: redis
});