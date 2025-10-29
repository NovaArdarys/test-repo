import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";

export interface StorageUploadEvent {
  menuPlanId: string;
  entityType?: string;
  entityId?: string;
  allStepCompleted: boolean;
}

export async function publishStepUpdate(data: StorageUploadEvent) {
  try {
    const channel = await getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });

    const success = channel.publish(
      EXCHANGES.STORAGE,
      "delivery.step.commit",
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (!success) {
      console.error(`[RABBITMQ] Failed to publish storage upload: ${data.menuPlanId}`);
    } else {
      console.log(`[STORAGE PUBLISH] File queued: ${data.menuPlanId}`);
    }
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}
