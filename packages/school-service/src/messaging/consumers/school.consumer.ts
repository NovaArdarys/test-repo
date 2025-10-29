import { z } from "zod";
import { Channel, ConsumeMessage } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateSchool } from "@/services/repositories/school.service";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues, {
  error: () => ({ message: `Invalid type ${entityTypeEnum.enumValues.join(', ')}` }),
});


const storageCommittedSchema = z.object({
  storageId: z.string(),
  url: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

// ===== queue dan route key =====
const STORAGE_QUEUE_NAME = "school_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const LOG_QUEUE_NAME = "school_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// consumer
async function handleStorageEvent(msg: import("amqplib").ConsumeMessage | null, channel: import("amqplib").Channel) {
  if (!msg) return;

  try {
    const parsed = JSON.parse(msg.content.toString());
    console.log("🪅 =====parsed====== ", parsed);
    const data = storageCommittedSchema.parse(parsed);


    if (data.entityType === "school") {
      await updateSchool(data.entityId, {
        storageId: data.storageId,
        imageURL: data.url,
        updatedBy: data.meta?.uploadedBy,
      });

      console.log(`[STORAGE EVENT] Updated _profile ${data.entityId}`);
    }

    channel.ack(msg);
  } catch (err: any) {
    console.log(err);
    channel.nack(msg, false, false);
  }
}


function handleLogEvent(msg: ConsumeMessage | null, channel: Channel) {
  if (!msg) return;

  try {
    const content = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    console.warn(`[EVENT IN] [${routingKey}] Received log event:`, content);

    channel.ack(msg);
  } catch (error) {
    console.error("[LOG EVENT ERROR]", error);
    channel.nack(msg, false, false);
  }
}

// setup
export async function setupSchoolServiceConsumers(channel: Channel) {

  // log
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, (msg) => handleLogEvent(msg, channel), { noAck: false });
  console.log(`[*] School Service waiting for log events in ${logQueue.queue}`);

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, (msg) => handleStorageEvent(msg, channel), { noAck: false });
  console.log(`[*] School Service waiting for storage events in ${storageQueue.queue}`);
}
