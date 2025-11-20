import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
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
async function handleStepCommit(data: z.infer<typeof stepCommittedSchema>) {
  const parsed = stepCommittedSchema.parse(data);
  console.log("🪅 [DELIVERY EVENT IN] Parsed:", parsed);

  if (parsed.entityType === "kitchen" && parsed.allStepCompleted) {
    console.log("🪅 Masuk:", parsed);

    await deliveryQueue.add("delivery-creation", parsed, {
      jobId: `delivery|${parsed.entityId}|${parsed.menuPlanId}|${format(new Date(), "yyyyMMdd_HHmmss")}`,
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

export async function setupDeliveryServiceConsumers(channel: Channel) {

  // STEP Listener (delivery.step.commit)
  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });
  const stepQueue = await channel.assertQueue(STEP_QUEUE_NAME, { durable: true });
  await channel.bindQueue(stepQueue.queue, EXCHANGES.REPORT, STEP_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(stepQueue.queue, safeConsume(handleStepCommit, channel), { noAck: false });
  console.log(`[*] Delivery Service listening for STEP COMMIT events in ${stepQueue.queue}`);
}
