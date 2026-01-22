// menu-plan-service/src/messaging/publishers/menu.publisher.ts
import z from "zod";
import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

const menuPlanCreatedSchema = z.object({
  sagaId: z.string(),
  jobId: z.string(),
  menuPlanId: z.string(),
  kitchenId: z.string(),
  planStartDate: z.string().optional(),
  beneficiaries: z.array(z.any()).optional(),
  createdBy: z.string().optional(),
  eventType: z.string(),
  _meta: z.object({
    eventId: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

export async function publishMenuEvent(routingKey: "menu-plan.created", data: z.infer<typeof menuPlanCreatedSchema>) {
  try {
    const validated = menuPlanCreatedSchema.parse(data);

    await safePublish(
      EXCHANGES.MENU,
      routingKey,
      validated
    );

    console.log(`[MENU PUBLISH] Event published: ${validated.eventType} for ${validated.menuPlanId}`);

  } catch (err) {
    console.error("[MENU PUBLISH ERROR]", err);
    throw err;
  }
}