import { createLoggedWorker } from "@/utils/catchWorker";
import { DELIVERY_QUEUE_NAME } from "../queue/delivery.queue";
import { notifyJobSchema } from "@/validators/jobs/delivery.schema";

export const deliveryWorker = createLoggedWorker<unknown>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    console.log("🏢 job worker:", job.name, job.data);

    switch (job.name) {

      case "dropoff-creation": {
        // const parsed = dropoffJobSchema.parse(job.data);

        // await createAutoDelivery({
        //   kitchenId: parsed.entityId,
        //   menuPlanId: parsed.menuPlanId,
        //   status: "PENDING",
        //   createdBy: "11111111-1111-1111-1111-111111111111",
        // });

        break;
      }

      case "pickup-creation": {
        // const parsed = pickupJobSchema.parse(job.data);
        // const beneficiary = await getDeliveryBeneficiary(parsed.id);

        // await createDelivery({
        //   kitchenId: parsed.kitchenId,
        //   driverId: parsed.driverId,
        //   startTime: new Date(parsed.startTime) || new Date(),
        //   endTime: null,
        //   estimatedDeliveryTime: new Date(parsed.estimatedDeliveryTime),
        //   status: "PENDING",
        //   notes: parsed.notes,
        //   portionType: parsed.portionType,
        //   receivedPortion: 0,
        //   createdBy: "11111111-1111-1111-1111-111111111111",
        // }, beneficiary.beneficiaryId, parsed.portionType, beneficiary.menuPlanId);

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
