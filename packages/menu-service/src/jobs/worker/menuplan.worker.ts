// jobs/worker/menuplan.worker.ts
import { Worker } from "bullmq";
import { redisBull } from "@/constants/redis";
import { MENU_PLAN_QUEUE } from "../queue/menuplan.queue";
import { menuPlanJobSchema } from "@/jobs/types/menuplan.type";
import { updateMenuPlan } from "@/services/repositories/menu.plan.service";
import { createMenuPlan } from "@/services/repositories/web/v2/menu-plan/menu.plan.v2.service";

export const menuPlanWorker = new Worker(
  MENU_PLAN_QUEUE,
  async (job) => {
    try {
      console.log("▶️ MenuPlan Worker processing:", job.name, job.data);

      const input = menuPlanJobSchema.parse(job.data);

      console.log(input.kitchenId,
        input.foodItemsIds,
        [input.dates], "=====menuplan=====");

      switch (input.type) {
        case "create":
          await createMenuPlan(
            input.data,
            input.kitchenId!,
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
    } catch (error: any) {
      if (job.attemptsMade < job.opts.attempts!) {
        throw error;
      }
      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        return { skipped: true };
      }

      throw error;
    }
  },
  {
    connection: redisBull,
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
