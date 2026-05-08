import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateKitchen } from "@/services/repositories/kitchen.service";
import { updateSupplier } from "@/services/repositories/suppliers.service";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { assignUserToKitchen, isUserAssignedToKitchen } from "@/services/repositories/user.kitchen.service";
import { createDriver, getDriverByUserId, isDriverAssignedToKitchen, isUserAlreadyHaveDriverRole, updateDriver } from "@/services/repositories/driver.service";

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
  driverCapacity: z.number().optional(),
});

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "kitchen_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const USER_ASSIGN_KITCHEN_QUEUE_NAME = "kitchen_service_assign_user_queue";
const USER_ASSIGN_KITCHEN_ROUTING_KEY = "kitchen.assign.commit";

const USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME = "driver_assign_user_queue";
const USER_DRIVER_ASSIGN_KITCHEN_ROUTING_KEY = "driver.assign.commit";

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
    console.log(`[STORAGE EVENT] Updated kitchen ${parsed.entityId}`);
  }

  if (parsed.entityType === "profile_supplier" && parsed.storageId) {
    await updateSupplier(parsed.entityId, {
      storageId: parsed.storageId,
      imageURL: parsed.url,
      updatedBy: parsed.meta?.uploadedBy,
    });
    console.log(`[STORAGE EVENT] Updated supplier ${parsed.entityId}`);
  }
}

// Assign User to Kitchen
async function handleAssignToKitchen(data: z.infer<typeof baseUserKitchen>) {
  const parsed = baseUserKitchen.parse(data);

  if (parsed?.userId && parsed?.kitchenId) {

    const alreadyAssigned = await isUserAssignedToKitchen(parsed?.userId, parsed?.kitchenId);
    if (!alreadyAssigned) {
      await assignUserToKitchen({
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

  const existingDriver = await getDriverByUserId(parsed.userId);

  if (!existingDriver) {
    await createDriver({
      kitchenId: parsed.kitchenId,
      userId: parsed.userId,
      createdBy: parsed.createdBy || "11111111-1111-1111-1111-111111111111",
      portionCapacity: parsed.driverCapacity
    });
    console.log(`[USER EVENT] Created NEW driver record for user ${parsed.userId} at kitchen ${parsed.kitchenId}`);
  } else {
    await updateDriver(existingDriver.id, {
      kitchenId: parsed.kitchenId,
      userId: parsed.userId,
      portionCapacity: parsed.driverCapacity,
      updatedBy: parsed.createdBy || "11111111-1111-1111-1111-111111111111",
    });
    console.log(`[USER EVENT] Updated EXISTING driver ${existingDriver.id} for user ${parsed.userId} (Kitchen: ${parsed.kitchenId})`);
  }
}

// ================= SETUP =================
export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    STORAGE_QUEUE_NAME,
    `${STORAGE_QUEUE_NAME}.retry`,

    USER_ASSIGN_KITCHEN_QUEUE_NAME,
    `${USER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`,

    USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME,
    `${USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`,
  ]);
  channel.prefetch(10);

  // STORAGE EVENTS
  {
    const RETRY_EXCHANGE = `${EXCHANGES.STORAGE}.retry`;

    await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
    await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

    const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": RETRY_EXCHANGE,
      },
    });

    await channel.assertQueue(`${STORAGE_QUEUE_NAME}.retry`, {
      durable: true,
      arguments: {
        "x-message-ttl": 5000,
        "x-dead-letter-exchange": EXCHANGES.STORAGE,
      },
    });

    await channel.bindQueue(
      storageQueue.queue,
      EXCHANGES.STORAGE,
      STORAGE_ROUTING_KEY
    );

    await channel.bindQueue(
      `${STORAGE_QUEUE_NAME}.retry`,
      RETRY_EXCHANGE,
      STORAGE_ROUTING_KEY
    );

    channel.consume(
      storageQueue.queue,
      safeConsume(handleStorageEvent, channel, {
        serviceName: "kitchen-storage",
        getIdempotencyKey: (data) => `${data.entityId}:${data.storageId}:${(data as any)?._meta?.eventId ?? "none"}`
      }),
      { noAck: false }
    );

    console.log(`[*] Kitchen listening STORAGE on ${storageQueue.queue}`);
  }

  // USER ASSIGN KITCHEN
  {
    const RETRY_EXCHANGE = `${EXCHANGES.USER}.retry`;

    await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
    await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

    const userQueue = await channel.assertQueue(USER_ASSIGN_KITCHEN_QUEUE_NAME, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": RETRY_EXCHANGE,
      },
    });

    await channel.assertQueue(`${USER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`, {
      durable: true,
      arguments: {
        "x-message-ttl": 5000,
        "x-dead-letter-exchange": EXCHANGES.USER,
      },
    });

    await channel.bindQueue(
      userQueue.queue,
      EXCHANGES.USER,
      USER_ASSIGN_KITCHEN_ROUTING_KEY
    );

    await channel.bindQueue(
      `${USER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`,
      RETRY_EXCHANGE,
      USER_ASSIGN_KITCHEN_ROUTING_KEY
    );

    channel.consume(
      userQueue.queue,
      safeConsume(handleAssignToKitchen, channel,
        {
          serviceName: "assign-user-kitchen",
          getIdempotencyKey: (data) => `${data.kitchenId}:${data.userId}:${(data as any)?._meta?.eventId ?? "none"}`
        }
      ),
      { noAck: false }
    );

    console.log(`[*] Kitchen listening USER on ${userQueue.queue}`);
  }

  // USER DRIVER ASSIGN
  {
    const RETRY_EXCHANGE = `${EXCHANGES.USER}.retry`;

    const userDriverQueue = await channel.assertQueue(
      USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME,
      {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": RETRY_EXCHANGE,
        },
      }
    );

    await channel.assertQueue(
      `${USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`,
      {
        durable: true,
        arguments: {
          "x-message-ttl": 5000,
          "x-dead-letter-exchange": EXCHANGES.USER,
        },
      }
    );

    await channel.bindQueue(
      userDriverQueue.queue,
      EXCHANGES.USER,
      USER_DRIVER_ASSIGN_KITCHEN_ROUTING_KEY
    );

    await channel.bindQueue(
      `${USER_DRIVER_ASSIGN_KITCHEN_QUEUE_NAME}.retry`,
      RETRY_EXCHANGE,
      USER_DRIVER_ASSIGN_KITCHEN_ROUTING_KEY
    );

    channel.consume(
      userDriverQueue.queue,
      safeConsume(handleAssignProfileDriver, channel, {
        serviceName: "assign-profile-driver-kitchen",
        getIdempotencyKey: (data) => `${data.kitchenId}:${data.userId}:${data.driverCapacity}:${(data as any)?._meta?.eventId ?? "none"}`
      }),
      { noAck: false }
    );

    console.log(`[*] Kitchen listening USER DRIVER on ${userDriverQueue.queue}`);
  }
}
