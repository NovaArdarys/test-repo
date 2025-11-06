import redis from '@/constants/redis';
import { createAutoDelivery } from '@/services/repositories/delivery.school.driver.service';
import { stepCommittedSchema } from '@/types/delivery.type';
import { Worker } from 'bullmq';
import z from 'zod';
import { DELIVERY_QUEUE_NAME } from '../queue/delivery.queue';

export const deliveryWorker = new Worker<z.infer<typeof stepCommittedSchema>>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    console.log(`🍳 [Worker] Processing job ${job.id} - ${JSON.stringify(job.data)} - ${job.name}`);
    const start = performance.now();

    try {
      const { allStepCompleted, entityId, entityType, menuPlanId } = job.data;
      const result = await createAutoDelivery({
        kitchenId: entityId,
        menuPlanId: menuPlanId,
        status: "PENDING",
        createdBy: "00000000-0000-0000-0000-000000000000", // system user
      });
      console.log(`✅ [Worker] Delivery created for ${entityId}`, result);
      // switch (job.name) {
      //   case "delivery-creation": {
      //     break;
      //   }

      //   case "delivery-notify": {
      //     console.log(`📩 Notify driver for ${job.data.entityId}`);
      //     break;
      //   }

      //   default:
      //     console.warn(`⚠️ Unknown job name: ${job.name}`);
      // }

    } catch (error: any) {
      console.log(error, "==== error ====");

    }
  },
  { connection: redis }
);

deliveryWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

deliveryWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed:`, err);
});


// import { z } from "zod";
// import { stepCommittedSchema } from "@/types/delivery.type";
// import { createAutoDelivery } from "@/services/repositories/delivery.school.driver.service";
// import { createLoggedWorker } from "@/utils/catchWorker";
// import { DELIVERY_QUEUE_NAME } from "../queue/delivery.queue";

// export const deliveryWorker = createLoggedWorker<z.infer<typeof stepCommittedSchema>>(
//   DELIVERY_QUEUE_NAME,
//   async (job) => {
//     console.log(job.name, job.data, "🏢 job worker");

//     switch (job.name) {
//       case "delivery-creation": {
//         const { entityId, menuPlanId } = job.data;
//         await createAutoDelivery({
//           kitchenId: entityId,
//           menuPlanId,
//           status: "PENDING",
//           createdBy: "00000000-0000-0000-0000-000000000000",
//         });
//         break;
//       }

//       case "delivery-notify": {
//         break;
//       }

//       default:
//         console.warn(`⚠️ Unknown job name: ${job.name}`);
//     }
//   }
// );
