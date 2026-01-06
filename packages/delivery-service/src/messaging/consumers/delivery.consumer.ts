import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { dropoffJobSchema } from "@/types/delivery.type";
import { deliveryQueue } from "@/jobs/queue/delivery.queue";
import { format } from "date-fns";

// ===== QUEUES =====
const STEP_QUEUE_NAME = "report_service_step_queue";
const STEP_ROUTING_KEY = "report.step.commit";

// ================= HANDLERS =================
async function handleStepCommit(data: z.infer<typeof dropoffJobSchema>) {
  const parsed = dropoffJobSchema.parse(data);

  if (parsed.entityType === "kitchen" && parsed.allStepCompleted) {

    // await deliveryQueue.add("dropoff-creation", parsed, {
    //   jobId: `delivery|${parsed.entityId}|${parsed.menuPlanId}|${format(new Date(), "yyyyMMdd_HHmmss")}`,
    //   attempts: 3,
    //   backoff: { type: "exponential", delay: 3000 },
    //   removeOnComplete: true,
    //   removeOnFail: false,
    // });

    console.log(`[DELIVERY EVENT] ✅ Auto delivery created for kitchen ${parsed.entityId}`);
  } else {
    console.log(`[DELIVERY EVENT] ⚠️ Skipped: entityType=${parsed.entityType}, allStepCompleted=${parsed.allStepCompleted}`);
  }
}

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    STEP_QUEUE_NAME,
    `${STEP_QUEUE_NAME}.retry`,
  ]);
  const RETRY_EXCHANGE = `${EXCHANGES.REPORT}.retry`;

  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const stepQueue = await channel.assertQueue(STEP_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${STEP_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000, // 5 detik
      "x-dead-letter-exchange": EXCHANGES.REPORT,
    },
  });

  await channel.bindQueue(
    stepQueue.queue,
    EXCHANGES.REPORT,
    STEP_ROUTING_KEY
  );

  await channel.bindQueue(
    `${STEP_QUEUE_NAME}.retry`,
    RETRY_EXCHANGE,
    STEP_ROUTING_KEY
  );

  channel.prefetch(10);

  channel.consume(
    stepQueue.queue,
    safeConsume(handleStepCommit, channel),
    { noAck: false }
  );

  console.log(
    `[*] Delivery Service listening for STEP COMMIT events in ${stepQueue.queue}`
  );
}

