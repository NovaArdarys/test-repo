import { z } from "zod";
import { Channel, ConsumeMessage } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { createAutoDelivery } from "@/services/repositories/delivery.school.driver.service";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues, {
  error: () => ({ message: `Invalid type ${entityTypeEnum.enumValues.join(', ')}` }),
});


const storageCommittedSchema = z.object({
  menuPlanId: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  allStepCompleted: z.preprocess((a) => a === 'true', z.boolean()),
});

// ===== queue dan route key =====
const STEP_QUEUE_NAME = "delivery_service_step_queue";
const STEP_ROUTING_KEY = "delivery.step.commit";

const LOG_QUEUE_NAME = "delivery_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// consumer
async function handleStorageEvent(msg: import("amqplib").ConsumeMessage | null, channel: import("amqplib").Channel) {
  if (!msg) return;

  try {
    const parsed = JSON.parse(msg.content.toString());
    console.log("🪅 =====parsed====== ", parsed);
    const data = storageCommittedSchema.parse(parsed);


    console.log(data);
    // createDelivery

    if (data.entityType === "kitchen" && data.allStepCompleted) {
      await createAutoDelivery({
        kitchenId: data.entityId,
        menuPlanId: data.menuPlanId,
        status: "PENDING",
        createdBy: ""
      });
    }

    //   console.log(`[STORAGE EVENT] Updated user_profile ${data.entityId}`);
    // }

    // if (data.entityType === "profile_supplier") {
    //   await updateSupplier(data.entityId, {
    //     storageId: data.storageId,
    //     imageURL: data.url,
    //     updatedBy: data.meta?.uploadedBy,
    //   });

    //   console.log(`[STORAGE EVENT] Updated user_profile ${data.entityId}`);
    // }

    channel.ack(msg);
  } catch (err: any) {
    console.log(err);
    channel.nack(msg, false, false);
  }
}


function handleLogEvent(msg: ConsumeMessage | null, channel: Channel) {
  if (!msg) return;

  try {
    const content = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    console.warn(`[EVENT IN] [${routingKey}] Received log event:`, content);

    channel.ack(msg);
  } catch (error) {
    console.error("[LOG EVENT ERROR]", error);
    channel.nack(msg, false, false);
  }
}

// setup
export async function setupDeliveryServiceConsumers(channel: Channel) {

  // log
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, (msg) => handleLogEvent(msg, channel), { noAck: false });
  console.log(`[*] Delivery Service waiting for log events in ${logQueue.queue}`);

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STEP_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STEP_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, (msg) => handleStorageEvent(msg, channel), { noAck: false });
  console.log(`[*] Delivery Service waiting for storage events in ${storageQueue.queue}`);
}
