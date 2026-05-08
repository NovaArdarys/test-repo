import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { assignUserToBeneficiary, isUserAssignedToBeneficiary, updateBeneficiary } from "@/services/repositories/beneficiary.service";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";

// ===== VALIDATORS =====
const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

const storageCommittedSchema = z.object({
  storageId: z.string(),
  url: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

const baseUserSchool = z.object({
  beneficiaryId: z.string(),
  userId: z.string(),
  createdBy: z.string().optional(),
});

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "beneficiary_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const USER_ASSIGN_BENEFICIARY_QUEUE_NAME = "beneficiary_service_assign_user_queue";
const USER_ASSIGN_BENEFICIARY_ROUTING_KEY = "beneficiary.assign.commit";
// ================= HANDLERS =================

// Storage Upload Event
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  if (parsed.entityType === "school" || parsed.entityType === "beneficiary") {
    await updateBeneficiary(parsed.entityId, {
      storageId: parsed.storageId,
      imageUrl: parsed.url,
      updatedBy: parsed.meta?.uploadedBy,
    });

    console.log(`[SCHOOL STORAGE EVENT] ✅ Updated school ${parsed.entityId}`);
  } else {
    console.log(`[SCHOOL STORAGE EVENT] ⚠️ Skipped entityType: ${parsed.entityType}`);
  }
}

// User Assign Event
async function handleAssignToSchool(data: z.infer<typeof baseUserSchool>) {
  try {
    const parsed = baseUserSchool.parse(data);

    if (parsed.userId && parsed.beneficiaryId) {
      const alreadyAssigned = await isUserAssignedToBeneficiary(parsed.userId, parsed.beneficiaryId);
      if (!alreadyAssigned) {
        await assignUserToBeneficiary({
          beneficiaryId: parsed?.beneficiaryId,
          userId: parsed?.userId,
          createdBy: parsed?.createdBy,
        });
      }
    }
    console.log(`[USER EVENT] Assign user ${parsed.userId} to school ${parsed.beneficiaryId}`);
  } catch (error) {
    console.log("====failed======", error);

  }
}

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    STORAGE_QUEUE_NAME,
    `${STORAGE_QUEUE_NAME}.retry`,
    USER_ASSIGN_BENEFICIARY_QUEUE_NAME,
    `${USER_ASSIGN_BENEFICIARY_QUEUE_NAME}.retry`,
  ]);

  channel.prefetch(10);

  // STORAGE LISTENER
  const STORAGE_RETRY_EXCHANGE = `${EXCHANGES.STORAGE}.retry`;

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  await channel.assertExchange(STORAGE_RETRY_EXCHANGE, "topic", { durable: true });

  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": STORAGE_RETRY_EXCHANGE,
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
    STORAGE_RETRY_EXCHANGE,
    STORAGE_ROUTING_KEY
  );

  channel.consume(
    storageQueue.queue,
    safeConsume(handleStorageEvent, channel, {
      serviceName: "school-storage",
      getIdempotencyKey: (data: z.infer<typeof storageCommittedSchema>) => `${data.entityId}:${data?.storageId}:${data.entityType}:${(data as any)?._meta?.eventId ?? "none"}`
    },),

    { noAck: false }
  );

  console.log(`[*] School Service listening for STORAGE events in ${storageQueue.queue}`);

  // USER LISTENER
  const USER_RETRY_EXCHANGE = `${EXCHANGES.USER}.retry`;

  await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
  await channel.assertExchange(USER_RETRY_EXCHANGE, "topic", { durable: true });

  const userQueue = await channel.assertQueue(USER_ASSIGN_BENEFICIARY_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": USER_RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${USER_ASSIGN_BENEFICIARY_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGES.USER,
    },
  });

  await channel.bindQueue(
    userQueue.queue,
    EXCHANGES.USER,
    USER_ASSIGN_BENEFICIARY_ROUTING_KEY
  );

  await channel.bindQueue(
    `${USER_ASSIGN_BENEFICIARY_QUEUE_NAME}.retry`,
    USER_RETRY_EXCHANGE,
    USER_ASSIGN_BENEFICIARY_ROUTING_KEY
  );

  channel.consume(
    userQueue.queue,
    safeConsume(handleAssignToSchool, channel, {
      serviceName: "school-assign-user",
      getIdempotencyKey: (data: z.infer<typeof baseUserSchool>) => `${data.userId}:${data?.beneficiaryId}:${data.createdBy}:${(data as any)?._meta?.eventId ?? "none"}`
    },),
    { noAck: false }
  );

  console.log(`[*] School Service listening for USER events in ${userQueue.queue}`);
}
