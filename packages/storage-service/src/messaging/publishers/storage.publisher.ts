// services/publisher/storagePublisher.ts
import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export interface StorageUploadEvent {
  tempPath: string;
  targetPath: string;
  url: string;
  storageId?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
}

/**
 * Publish event ke RabbitMQ saat file berhasil diupload
 * @param data StorageUploadEvent
 */
export async function publishStorageUpload(data: StorageUploadEvent) {
  try {
    await safePublish(EXCHANGES.STORAGE, "storage.upload.commit", data);

    console.log(`[STORAGE PUBLISH] File queued: ${data.targetPath}`);
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}
