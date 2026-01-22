import { dropoffJobSchema } from "@/validators/jobs/delivery.schema";
import z from "zod";

export async function handleStepCommit(data: z.infer<typeof dropoffJobSchema>) {
  const parsed = dropoffJobSchema.parse(data);

  if (parsed.entityType === "kitchen" && parsed.allStepCompleted) {

    // await deliveryQueue.add("dropoff-creation", parsed, {
    //   jobId: `delivery|${parsed.entityId}|${parsed.menuPlanId}|${format(new Date(), "yyyyMMdd_HHmmss")}`,
    //   attempts: 3,
    //   backoff: { type: "exponential", delay: 3000 },
    //   removeOnComplete: true,
    //   removeOnFail: false,
    // });

    console.log(`[DELIVERY EVENT] [*] Auto delivery created for kitchen ${parsed.entityId}`);
  } else {
    console.log(`[DELIVERY EVENT] [*] Skipped: entityType=${parsed.entityType}, allStepCompleted=${parsed.allStepCompleted}`);
  }
}