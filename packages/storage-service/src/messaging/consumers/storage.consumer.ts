import { commitFileToMinio } from "@/utils/minioClient";
import { EXCHANGES } from "../events/exchanges";
import { linkStorageToEntity } from "@/services/repositories/storage.service";
import { Channel, ConsumeMessage } from "amqplib";

export interface StorageCommitEvent {
  tempPath: string;
  targetPath: string;
  tmpId?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
}

export async function setupStorageConsumer(channel: Channel) {

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const q = await channel.assertQueue("storage.upload.commit.queue", { durable: true });
  await channel.bindQueue(q.queue, EXCHANGES.STORAGE, "storage.upload.commit");

  console.log("[STORAGE WORKER] Waiting for upload commit events...");

  channel.consume(q.queue, async (msg) => {
    if (!msg) return;

    try {
      const data: StorageCommitEvent = JSON.parse(msg.content.toString());

      await commitFileToMinio(data.tempPath, data.targetPath, data.meta);

      if (data.entityType && data.entityId) {
        linkStorageToEntity(data.entityId, data.entityType as any);
      }

      channel.ack(msg);
      console.log(`[STORAGE WORKER] Committed: ${data.targetPath}`);
    } catch (err) {
      console.error("[STORAGE WORKER ERROR]", err);
      channel.nack(msg, false, false);
    }
  });
}
