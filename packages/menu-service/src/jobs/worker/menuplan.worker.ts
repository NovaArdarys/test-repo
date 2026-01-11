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

      if (input.type === "create") {
        const result = await createMenuPlan(
          input.data,
          input.kitchenId!,
          input.foodItemsIds,
          [input.dates]
        );

        return { status: "created", result };
      }

      if (input.type === "update") {
        const result = await updateMenuPlan(
          input.menuPlanId!,
          input.data,
          input.kitchenId,
          input.foodItemsIds,
          input.updatedBy
        );
        return { status: "updated", result };
      }

      console.warn("⚠ Unknown menu plan job type:", input.type);
      return { skipped: true };

    } catch (error: any) {

      // Handle duplicate
      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        await job.remove();
        return { skipped: true };
      }

      // Retry if still allowed
      if (job.attemptsMade < job.opts.attempts!) {
        throw error;
      }

      // No more retry
      console.error("menuplan job dead:", error);
      throw error;
    }
  },
  {
    connection: redisBull,
    concurrency: 3,
    lockDuration: 90000,
    autorun: true,
    maxStalledCount: 2,
    stalledInterval: 60000,
  }
);


menuPlanWorker.on("error", err => console.error("worker error:", err));
menuPlanWorker.on("failed", err => console.error("worker failed:", err));
menuPlanWorker.on("closed", () => console.log("worker closed"));
menuPlanWorker.on("active", job => console.log("active:", job.id));
menuPlanWorker.on("completed", job => console.log("completed:", job.id));