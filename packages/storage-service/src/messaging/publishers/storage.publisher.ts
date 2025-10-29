// services/publisher/storagePublisher.ts
import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";

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
    const channel = await getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });

    const success = channel.publish(
      EXCHANGES.STORAGE,
      "storage.upload.commit",
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (!success) {
      console.error(`[RABBITMQ] Failed to publish storage upload: ${data.targetPath}`);
    } else {
      console.log(`[STORAGE PUBLISH] File queued: ${data.targetPath}`);
    }
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}
