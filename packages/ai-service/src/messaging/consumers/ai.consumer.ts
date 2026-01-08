import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { foodQueue } from "@/jobs/queue/food.queue";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { stepCommittedSchema } from "@/validator/step.validator";

// ===== QUEUES =====
const AI_QUEUE_NAME = "ai_service_queue";
const STEP_ROUTING_KEY = "report.step.commit";

// ================= HANDLERS =================
async function handleStepEvent(data: z.infer<typeof stepCommittedSchema>) {
  const parsed = stepCommittedSchema.parse(data);

  await foodQueue.add("detection", parsed, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 1000000,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });

  console.log(`[AI WORKER] ✅ Job queued for detection`);
}


// ================= SETUP =================
export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    AI_QUEUE_NAME,
    `${AI_QUEUE_NAME}.retry`,
  ]);
  const RETRY_EXCHANGE = `${EXCHANGES.REPORT}.retry`;

  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const reportQueue = await channel.assertQueue(AI_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${AI_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGES.REPORT,
    },
  });

  await channel.bindQueue(reportQueue.queue, EXCHANGES.REPORT, STEP_ROUTING_KEY);
  await channel.bindQueue(
    `${AI_QUEUE_NAME}.retry`,
    RETRY_EXCHANGE,
    STEP_ROUTING_KEY
  );

  channel.prefetch(10);

  channel.consume(
    reportQueue.queue,
    safeConsume(handleStepEvent, channel),
    { noAck: false }
  );

  console.log(`[*] AI Service listening for REPORT events in ${reportQueue.queue}`);
}
