import { createLoggedWorker } from "@/utils/catchWorker";
import { DELIVERY_QUEUE_NAME } from "../queue/delivery.queue";
import { handleMenuPlanCreated } from "@/services/repositories/web/handlers/menuPlanHandler";
import { ReportQueueSchema } from "../types/report.type";

export const deliveryWorker = createLoggedWorker<unknown>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    try {
      console.log("▶️ MenuPlan Worker processing:", job.name, job.data);

      const input = ReportQueueSchema.parse(job.data);

      if (input.type === "create") {
        await handleMenuPlanCreated(input.data);
      }

      if (input.type === "update") {

      }


    } catch (error: any) {

      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        await job.remove();
      }

      if (job.attemptsMade < job.opts.attempts!) {
        throw error;
      }

      throw error;
    }
  }
);
