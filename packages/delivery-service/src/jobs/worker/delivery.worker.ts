import { z } from "zod";
import { createAutoDelivery } from "@/services/repositories/delivery.school.driver.service";
import { createLoggedWorker } from "@/utils/catchWorker";
import { DELIVERY_QUEUE_NAME } from "../queue/delivery.queue";
import { createDelivery } from "@/services/repositories/delivery.service";
import { dropoffJobSchema, notifyJobSchema, pickupJobSchema } from "@/types/delivery.type";

export const deliveryWorker = createLoggedWorker<unknown>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    console.log("🏢 job worker:", job.name, job.data);

    switch (job.name) {

      case "dropoff-creation": {
        const parsed = dropoffJobSchema.parse(job.data);

        await createAutoDelivery({
          kitchenId: parsed.entityId,
          menuPlanId: parsed.menuPlanId,
          status: "PENDING",
          createdBy: "11111111-1111-1111-1111-111111111111",
        });

        break;
      }

      case "pickup-creation": {
        const parsed = pickupJobSchema.parse(job.data);

        // await createDelivery({
        //   kitchenId: data.kitchenId,
        //   driverId: driver.id,
        //   startTime: unit.deliveryTime || new Date(),
        //   endTime: null,
        //   estimatedDeliveryTime: estTime,
        //   notes: `${unit.type} portion`,
        //   status: "PENDING",
        //   updatedAt: new Date(),
        //   updatedBy: data.createdBy,
        //   portionType: unit.type,
        //   receivedPortion: 0,
        //   createdAt: new Date(),
        //   createdBy: "11111111-1111-1111-1111-111111111111",
        // });

        break;
      }

      case "delivery-notify": {
        const parsed = notifyJobSchema.parse(job.data);
        break;
      }

      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }
);
