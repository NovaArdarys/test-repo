import { getByStorageId, linkStorageToEntity } from '@/services/repositories/storage.service';
import { moveFileFromTmp } from '@/utils/minioClient';
import { StorageClientCommittedType } from '@/validator/storage.validator';
import { createLoggedWorker } from '@/messaging/utils/catchWorker';
import { STORAGE_CLIENT_QUEUE } from '../queue/storage.queue';
import { isUniqueConstraintError } from '@/messaging/utils/safeError';


export const deliveryWorker = createLoggedWorker<StorageClientCommittedType>(
  STORAGE_CLIENT_QUEUE,
  async (job) => {
    const { storageId, storageIds = [], entityId, entityType } = job.data;

    if (!entityType || (!storageId && !storageIds.length)) {
      console.warn(`Invalid payload for job ${job.id}, skipped`);
      return;
    }

    const ids = storageIds.length ? storageIds : [storageId];

    await Promise.all(
      ids.map(async (id: string) => {
        if (!id) return;

        try {
          const storage = await getByStorageId(id);
          if (!storage) {
            console.warn(`storage ${id} not found`);
            return;
          }

          const { fileUrl, fileName, path } = await moveFileFromTmp(
            storage.path,
            storage.fileName,
            entityType || 'other'
          );

          await linkStorageToEntity(
            id,
            entityId,
            path,
            fileUrl,
            fileName,
            entityType as any
          );

          console.log(`✅ [Worker] Linked storage ${id} → ${entityType}:${entityId}`);
        } catch (error: any) {
          if (isUniqueConstraintError(error)) {
            return;
          }

          console.error(`💥 [Worker] Failed linking ${id}:`, error.message || error);
          throw error;
        }
      })
    );
  }
);