import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateKitchen } from "@/services/repositories/kitchen.service";
import { updateSupplier } from "@/services/repositories/suppliers.service";
import { safeConsume } from "../utils/consumerHelper";
import { assignUserToKitchen, isUserAssignedToKitchen } from "@/services/repositories/user.kitchen.service";
import { createDriver, isUserAlreadyHaveDriverRole } from "@/services/repositories/driver.service";

// ===== VALIDATORS =====
const entityTypeValidator = z.enum(entityTypeEnum.enumValues);
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

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "kitchen_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const USER_ASSIGN_KITCHEN_QUEUE_NAME = "kitchen_service_assign_user_queue";
const USER_ASSIGN_KITCHEN_ROUTING_KEY = "kitchen.assign.commit";

const USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME = "driver_assign_user_queue";
const USER_DRIVER_ASSIGN_KITCHEN_ROUTING_KEY = "driver.assign.commit";

const LOG_QUEUE_NAME = "kitchen_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================

// Storage Event
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  if (parsed.entityType === "kitchen" && parsed.storageId) {
    await updateKitchen(parsed.entityId, {
      storageId: parsed.storageId,
      imageURL: parsed.url,
      updatedBy: parsed.meta?.uploadedBy,
    });
    console.log(`[STORAGE EVENT] ✅ Updated kitchen ${parsed.entityId}`);
  }

  if (parsed.entityType === "profile_supplier" && parsed.storageId) {
    await updateSupplier(parsed.entityId, {
      storageId: parsed.storageId,
      imageURL: parsed.url,
      updatedBy: parsed.meta?.uploadedBy,
    });
    console.log(`[STORAGE EVENT] ✅ Updated supplier ${parsed.entityId}`);
  }
}

// Log Event
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data?._meta?.eventId);

}

// Assign User to Kitchen
async function handleAssignToKitchen(data: z.infer<typeof baseUserKitchen>) {
  const parsed = baseUserKitchen.parse(data);

  if (parsed?.userId && parsed?.kitchenId) {

    const alreadyAssigned = await isUserAssignedToKitchen(parsed?.userId, parsed?.kitchenId);
    if (!alreadyAssigned) {
      await createDriver({
        kitchenId: parsed.kitchenId,
        userId: parsed.userId,
        createdBy: parsed.createdBy || "11111111-1111-1111-1111-111111111111",
      });
    }
  }


  console.log(`[USER EVENT] Assign user ${parsed.userId} to kitchen ${parsed.kitchenId}`);
}

async function handleAssignProfileDriver(data: z.infer<typeof baseUserKitchen>) {
  const parsed = baseUserKitchen.parse(data);

  const alreadyAssigned = await isUserAlreadyHaveDriverRole(parsed.userId, parsed.kitchenId);
  if (!alreadyAssigned) {
    await assignUserToKitchen({
      kitchenId: parsed.kitchenId,
      userId: parsed.userId,
      createdBy: parsed.createdBy,
    });
  }

  console.log(`[USER EVENT] Assign user ${parsed.userId} to kitchen ${parsed.kitchenId}`);
}

// ================= SETUP =================
export async function setupKitchenServiceConsumers(channel: Channel) {
  // Log
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] Listening for LOG events on ${logQueue.queue}`);

  // Storage
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] Listening for STORAGE events on ${storageQueue.queue}`);

  // User
  await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
  const userQueue = await channel.assertQueue(USER_ASSIGN_KITCHEN_QUEUE_NAME, { durable: true });
  await channel.bindQueue(userQueue.queue, EXCHANGES.USER, USER_ASSIGN_KITCHEN_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(userQueue.queue, safeConsume(handleAssignToKitchen, channel), { noAck: false });
  console.log(`[*] Listening for USER events on ${userQueue.queue}`);

  // Driver
  await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
  const userDriverQueue = await channel.assertQueue(USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME, { durable: true });
  await channel.bindQueue(userDriverQueue.queue, EXCHANGES.USER, USER_DRIVER_ASSIGN_KITCHEN_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(userDriverQueue.queue, safeConsume(handleAssignProfileDriver, channel), { noAck: false });
  console.log(`[*] Listening for USER Driver events on ${userDriverQueue.queue}`);
}
