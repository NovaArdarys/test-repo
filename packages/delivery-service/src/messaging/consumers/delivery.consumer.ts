// delivery-service/src/consumers/deliveryConsumer.ts
import { z } from "zod";
import { Channel } from "amqplib";
import { db } from "@/db";
import { jobStatus, sagaOrchestration } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { handleStepCommit } from "@/services/repositories/web/handlers/stepCommitHandler";
import { dropoffJobSchema } from "@/validators/jobs/delivery.schema";
import { handleMenuPlanCreated } from "@/services/repositories/web/handlers/menuPlanHandler";

// ===== VALIDATORS =====
const menuPlanCreatedSchema = z.object({
  sagaId: z.string(),
  jobId: z.string(),
  menuPlanId: z.string(),
  kitchenId: z.string(),
  planStartDate: z.string().optional(),
  createdBy: z.string().optional(),
  eventType: z.literal('DELIVERY_CREATION'),
  _meta: z.object({
    eventId: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

const MENU_PLAN_QUEUE_NAME = "delivery_service_menu_plan_queue";
const STEP_QUEUE_NAME = "delivery_service_step_queue";

const MENU_PLAN_ROUTING_KEY = "menu-plan.created";
const STEP_ROUTING_KEY = "report.step.commit";

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    MENU_PLAN_QUEUE_NAME,
    `${MENU_PLAN_QUEUE_NAME}.retry`,
    STEP_QUEUE_NAME,
    `${STEP_QUEUE_NAME}.retry`,
  ]);

  await channel.assertExchange(EXCHANGES.MENU, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.REPORT, "topic", { durable: true });

  const MENU_PLAN_RETRY_EXCHANGE = `${EXCHANGES.MENU}.retry`;
  const STEP_RETRY_EXCHANGE = `${EXCHANGES.REPORT}.retry`;

  await channel.assertExchange(MENU_PLAN_RETRY_EXCHANGE, "topic", { durable: true });
  await channel.assertExchange(STEP_RETRY_EXCHANGE, "topic", { durable: true });

  const menuPlanQueue = await channel.assertQueue(MENU_PLAN_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": MENU_PLAN_RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${MENU_PLAN_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000, // retry after 5 seconds
      "x-dead-letter-exchange": EXCHANGES.MENU,
    },
  });

  await channel.bindQueue(
    menuPlanQueue.queue,
    EXCHANGES.MENU,
    MENU_PLAN_ROUTING_KEY
  );

  await channel.bindQueue(
    `${MENU_PLAN_QUEUE_NAME}.retry`,
    MENU_PLAN_RETRY_EXCHANGE,
    MENU_PLAN_ROUTING_KEY
  );

  const stepQueue = await channel.assertQueue(STEP_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": STEP_RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${STEP_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
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
    STEP_RETRY_EXCHANGE,
    STEP_ROUTING_KEY
  );

  channel.prefetch(10);

  channel.consume(
    menuPlanQueue.queue,
    safeConsume(async (rawData: any) => {
      const validated = menuPlanCreatedSchema.parse(rawData);
      await handleMenuPlanCreated(validated);
    }, channel),
    { noAck: false }
  );

  channel.consume(
    stepQueue.queue,
    safeConsume(async (rawData: any) => {
      const validated = dropoffJobSchema.parse(rawData);
      await handleStepCommit(validated);
    }, channel),
    { noAck: false }
  );

}