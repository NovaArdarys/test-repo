// services/publisher/storagePublisher.ts
import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export interface ClientCommitStorageEvent {
  storageId?: string;
  entityId?: string;
  entityType?: string;
  meta?: Record<string, any>;
}

/**
 * Publish event ke RabbitMQ saat file berhasil diupload
 * @param data StorageUploadEvent
 */
export async function publishClientCommitStorage(data: ClientCommitStorageEvent) {
  try {
    await safePublish(EXCHANGES.BENEFICIARY, "client.storage.commit", data);

    console.log(`[SCHOOL PUBLISH] File queued: ${data.storageId}`);
  } catch (err) {
    console.error("[SCHOOL PUBLISH ERROR]", err);
  }
}
