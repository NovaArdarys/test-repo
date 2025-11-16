import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { assignUserToBeneficiary, isUserAssignedToBeneficiary, updateBeneficiary } from "@/services/repositories/beneficiary.service";
import { safeConsume } from "../utils/consumerHelper";

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

const LOG_QUEUE_NAME = "beneficiary_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

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

// Log Event
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data?._meta?.eventId);

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

export async function setupSchoolServiceConsumers(channel: Channel) {
  // LOG listener
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] School Service listening for LOG events in ${logQueue.queue}`);

  // STORAGE listener
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] School Service listening for STORAGE events in ${storageQueue.queue}`);

  // USER listener
  await channel.assertExchange(EXCHANGES.USER, "topic", { durable: true });
  const userQueue = await channel.assertQueue(USER_ASSIGN_BENEFICIARY_QUEUE_NAME, { durable: true });
  await channel.bindQueue(userQueue.queue, EXCHANGES.USER, USER_ASSIGN_BENEFICIARY_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(userQueue.queue, safeConsume(handleAssignToSchool, channel), { noAck: false });
  console.log(`[*] School Service listening for USER events in ${userQueue.queue}`);
}
