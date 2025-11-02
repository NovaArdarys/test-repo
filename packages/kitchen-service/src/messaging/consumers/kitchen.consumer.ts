import { z } from "zod";
import { Channel, ConsumeMessage } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateKitchen } from "@/services/repositories/kitchen.service";
import { updateSupplier } from "@/services/repositories/suppliers.service";

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

const baseUserKitchen = z.object({
  kitchenId: z.string(),
  userId: z.string(),
  createdBy: z.string().optional(),
});

// ===== queue dan route key =====
const STORAGE_QUEUE_NAME = "kitchen_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const USER_ASSIGN_KITCHEN_QUEUE_NAME = "kitchen_service_assign_user_queue";
const USER_ASSIGN_KITCHEN_ROUTING_KEY = "kitchen.assign.commit";

const LOG_QUEUE_NAME = "kitchen_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// consumer
async function handleStorageEvent(msg: import("amqplib").ConsumeMessage | null, channel: import("amqplib").Channel) {
  if (!msg) return;

  try {
    const parsed = JSON.parse(msg.content.toString());
    console.log("🪅 =====parsed====== ", parsed);
    const data = storageCommittedSchema.parse(parsed);


    if (data.entityType === "kitchen") {
      await updateKitchen(data.entityId, {
        storageId: data.storageId,
        imageURL: data.url,
        updatedBy: data.meta?.uploadedBy,
      });

      console.log(`[STORAGE EVENT] Updated user_profile ${data.entityId}`);
    }

    if (data.entityType === "profile_supplier") {
      await updateSupplier(data.entityId, {
        storageId: data.storageId,
        imageURL: data.url,
        updatedBy: data.meta?.uploadedBy,
      });

      console.log(`[STORAGE EVENT] Updated user_profile ${data.entityId}`);
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

function handleAssignToKitchen(msg: ConsumeMessage | null, channel: Channel) {
  if (!msg) return;

  try {
    const parsed = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;
    const data = baseUserKitchen.parse(parsed);


    console.warn(`[EVENT IN] [${routingKey}] Received log event:`, data);

    channel.ack(msg);
  } catch (error) {
    console.error("[LOG EVENT ERROR]", error);
    channel.nack(msg, false, false);
  }
}

// setup
export async function setupKitchenServiceConsumers(channel: Channel) {

  // log
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, (msg) => handleLogEvent(msg, channel), { noAck: false });
  console.log(`[*] Kitchen Service waiting for log events in ${logQueue.queue}`);

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, (msg) => handleStorageEvent(msg, channel), { noAck: false });
  console.log(`[*] Kitchen Service waiting for storage events in ${storageQueue.queue}`);

  await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
  const userQueue = await channel.assertQueue(USER_ASSIGN_KITCHEN_QUEUE_NAME, { durable: true });
  await channel.bindQueue(userQueue.queue, EXCHANGES.USER, USER_ASSIGN_KITCHEN_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(userQueue.queue, (msg) => handleAssignToKitchen(msg, channel), { noAck: false });
  console.log(`[*] User Service waiting for storage events in ${userQueue.queue}`);
}
