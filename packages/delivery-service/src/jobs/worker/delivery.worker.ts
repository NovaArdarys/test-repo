import { z } from "zod";
import { stepCommittedSchema } from "@/types/delivery.type";
import { createAutoDelivery } from "@/services/repositories/delivery.school.driver.service";
import { createLoggedWorker } from "@/utils/catchWorker";
import { DELIVERY_QUEUE_NAME } from "../queue/delivery.queue";

export const deliveryWorker = createLoggedWorker<z.infer<typeof stepCommittedSchema>>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    console.log(job.name, job.data, "🏢 job worker");

    switch (job.name) {
      case "delivery-creation": {
        const { entityId, menuPlanId } = job.data;
        await createAutoDelivery({
          kitchenId: entityId,
          menuPlanId,
          status: "PENDING",
          createdBy: "00000000-0000-0000-0000-000000000000",
        });
        break;
      }

      case "delivery-notify": {
        break;
      }

      default:
        console.warn(`⚠️ Unknown job name: ${job.name}`);
    }
  }
);
