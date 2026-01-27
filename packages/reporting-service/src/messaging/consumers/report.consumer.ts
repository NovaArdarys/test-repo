import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateStepReport } from "@/services/repositories/daily.report.service";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { handleMenuPlanCreated } from "@/services/repositories/web/v1/createReport/createReport";
import { reportQueue } from "@/jobs/queue/report";

// ===== VALIDATORS =====
const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

const storageCommittedSchema = z.object({
  storageId: z.string(),
  url: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

// ===== QUEUES =====
const MENU_PLAN_QUEUE_NAME = "report_service_menu_plan_queue";
const STORAGE_QUEUE_NAME = "report_service_storage_queue";;

const MENU_PLAN_ROUTING_KEY = "menu-plan.created";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

// ================= HANDLERS =================

// Storage Upload Event Handler
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  const validEntityTypes = [
    "kitchen_daily_report",
    "driver_daily_report",
    "school_daily_report",
  ];

  if (!validEntityTypes.includes(parsed.entityType)) {
    console.log(`[REPORT EVENT] ⚠️ Skipped unsupported entityType: ${parsed.entityType}`);
    return;
  }

  await updateStepReport(parsed.entityId, {
    storageId: parsed.storageId,
    imageURL: parsed.url,
    updatedBy: parsed.meta?.uploadedBy,
    updatedAt: new Date(),
  });

  console.log(`[REPORT STORAGE EVENT] ✅ Updated ${parsed.entityType} (${parsed.entityId})`);
}

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    MENU_PLAN_QUEUE_NAME,
    `${MENU_PLAN_QUEUE_NAME}.retry`,
    STORAGE_QUEUE_NAME,
    `${STORAGE_QUEUE_NAME}.retry`,
  ]);

  await channel.assertExchange(EXCHANGES.MENU, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });

  const MENU_PLAN_RETRY_EXCHANGE = `${EXCHANGES.MENU}.retry`;
  const STORAGE_RETRY_EXCHANGE = `${EXCHANGES.STORAGE}.retry`;

  await channel.assertExchange(MENU_PLAN_RETRY_EXCHANGE, "topic", { durable: true });
  await channel.assertExchange(STORAGE_RETRY_EXCHANGE, "topic", { durable: true });

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

  channel.prefetch(10);

  // channel.consume(
  //   menuPlanQueue.queue,
  //   safeConsume(handleMenuPlanCreated, channel),
  //   { noAck: false }
  // );
  channel.consume(
    menuPlanQueue.queue,
    safeConsume(async (data: any) => {
      await reportQueue.add(
        "report-create",
        {
          type: "create",
          data: data
        },
        {
          removeOnComplete: { age: 3600 * 24 * 7 },
          removeOnFail: { age: 3600 * 24 * 7 }
        }
      );
      // handleMenuPlanCreated
    }, channel),
    { noAck: false }
  );

  channel.consume(
    storageQueue.queue,
    safeConsume(handleStorageEvent, channel),
    { noAck: false }
  );
}
