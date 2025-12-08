// jobs/worker/menuplan.worker.ts
import { Worker } from "bullmq";
import redis from "@/constants/redis";
import { MENU_PLAN_QUEUE } from "../queue/menuplan.queue";
import { menuPlanJobSchema } from "@/jobs/types/menuplan.type";
import { createMenuPlan, updateMenuPlan } from "@/services/repositories/menu.plan.service";

export const menuPlanWorker = new Worker(
  MENU_PLAN_QUEUE,
  async (job) => {
    console.log("▶️ MenuPlan Worker processing:", job.name, job.data);

    const input = menuPlanJobSchema.parse(job.data);

    switch (input.type) {
      case "create":
        await createMenuPlan(
          input.data,
          input.kitchenId,
          input.foodItemsIds,
          [input.dates]
        );
        break;

      case "update":
        await updateMenuPlan(
          input.menuPlanId!,
          input.data,
          input.kitchenId,
          input.foodItemsIds,
          input.updatedBy
        );
        break;

      default:
        console.warn("⚠ Unknown menu plan job type:", input.type);
    }
  },
  {
    connection: redis,
    concurrency: 1,
    lockDuration: 300000,
    autorun: true,
  }
);

menuPlanWorker.on("completed", (job) => {
  console.log(`✔ MenuPlan Job Completed: ${job.id}`);
});

menuPlanWorker.on("failed", (job, err) => {
  console.error(`❌ MenuPlan Job Failed: ${job?.id}`, err);
});
