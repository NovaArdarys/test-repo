import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { createAutoDelivery } from "@/services/repositories/delivery.school.driver.service";
import { safeConsume } from "../utils/consumerHelper";
import { stepCommittedSchema } from "@/types/delivery.type";
import { deliveryQueue } from "@/jobs/queue/delivery.queue";
import { format } from "date-fns";

// ===== QUEUES =====
const STEP_QUEUE_NAME = "report_service_step_queue";
const STEP_ROUTING_KEY = "report.step.commit";

const LOG_QUEUE_NAME = "delivery_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================
// Handle Step Commit (trigger delivery)
async function handleStepCommit(data: z.infer<typeof stepCommittedSchema>) {
  const parsed = stepCommittedSchema.parse(data);
  console.log("🪅 [DELIVERY EVENT IN] Parsed:", parsed);

  if (parsed.entityType === "kitchen" && parsed.allStepCompleted) {
    console.log("🪅 Masuk:", parsed);

    await deliveryQueue.add("delivery-creation", parsed, {
      jobId: `delivery|${parsed.entityId}|${parsed.menuPlanId}|${format(new Date(), "yyyyMMdd")}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`[DELIVERY EVENT] ✅ Auto delivery created for kitchen ${parsed.entityId}`);
  } else {
    console.log(`[DELIVERY EVENT] ⚠️ Skipped: entityType=${parsed.entityType}, allStepCompleted=${parsed.allStepCompleted}`);
  }
}

// Handle Log Events
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data);
}


export async function setupDeliveryServiceConsumers(channel: Channel) {
  // LOG Listener
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] Delivery Service listening for LOG events in ${logQueue.queue}`);

  // STEP Listener (delivery.step.commit)
  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });
  const stepQueue = await channel.assertQueue(STEP_QUEUE_NAME, { durable: true });
  await channel.bindQueue(stepQueue.queue, EXCHANGES.REPORT, STEP_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(stepQueue.queue, safeConsume(handleStepCommit, channel), { noAck: false });
  console.log(`[*] Delivery Service listening for STEP COMMIT events in ${stepQueue.queue}`);
}
