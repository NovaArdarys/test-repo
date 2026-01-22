import z from "zod";
import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

const deliveryCreatedSchema = z.object({
  sagaId: z.string(),
  jobId: z.string(),
  menuPlanId: z.string(),
  kitchenId: z.string(),
  status: z.enum(['SUCCESS', 'FAILED']),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }).optional(),
  _meta: z.object({
    eventId: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

export async function publishDeliveryEvent(
  routingKey: "delivery.created" | "delivery.failed",
  data: z.infer<typeof deliveryCreatedSchema>
) {
  try {
    const validated = deliveryCreatedSchema.parse(data);

    await safePublish(
      EXCHANGES.DELIVERY,
      routingKey,
      validated
    );

    console.log(`[DELIVERY PUBLISH] ✅ Event published: ${routingKey} for ${validated.menuPlanId}`);
  } catch (err) {
    console.error("[DELIVERY PUBLISH ERROR]", err);
    throw err;
  }
}