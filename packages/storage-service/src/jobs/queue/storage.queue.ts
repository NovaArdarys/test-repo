import { Queue } from 'bullmq';
import { redisBull } from '@/constants/redis';
import { StorageClientCommittedType, } from '@/validator/storage.validator';
export const STORAGE_CLIENT_QUEUE = 'storage-client-queue';
export const storageQueue = new Queue<StorageClientCommittedType>(STORAGE_CLIENT_QUEUE, {
  connection: redisBull
});