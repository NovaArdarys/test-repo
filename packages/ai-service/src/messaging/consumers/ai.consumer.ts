import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { foodQueue } from "@/jobs/queue/food.queue";
import { safeConsume } from "../utils/consumerHelper";
import { stepCommittedSchema } from "@/validator/step.validator";

// ===== QUEUES =====
const AI_QUEUE_NAME = "ai_service_queue";
const REPORT_ROUTING_KEY = "report.step.commit";

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
export async function setupAiServiceConsumers(channel: Channel) {
  // STORAGE Listener (storage.upload.commit)
  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });
  const reportQueue = await channel.assertQueue(AI_QUEUE_NAME, { durable: true });
  await channel.bindQueue(reportQueue.queue, EXCHANGES.REPORT, REPORT_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(reportQueue.queue, safeConsume(handleStepEvent, channel), { noAck: false });
  console.log(`[*] AI Service listening for REPORT events in ${reportQueue.queue}`);
}
