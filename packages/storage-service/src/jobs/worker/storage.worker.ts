import redis from '@/constants/redis';
import { getByStorageId, linkStorageToEntity } from '@/services/repositories/storage.service';
import { moveFileFromTmp } from '@/utils/minioClient';
import { StorageClientCommittedType } from '@/validator/storage.validator';
import { Worker } from 'bullmq';

export const storageWorker = new Worker<StorageClientCommittedType>(
  'stroage-client-queue',
  async (job) => {
    try {

      const { storageId, entityId, entityType } = job.data;
      if (storageId && entityType) {

        const storage = await getByStorageId(storageId);
        const { fileUrl, fileName, path } = await moveFileFromTmp(storage.path, storage.fileName, entityType || "other");

        await linkStorageToEntity(storageId, entityId, path, fileUrl, fileName, entityType as any);
      }
    } catch (err: any) {


      throw err;
    }
  },
  { connection: redis }
);

storageWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

storageWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed:`, err);
});
