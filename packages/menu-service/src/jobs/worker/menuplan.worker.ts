// jobs/worker/menuplan.worker.ts
import { Worker } from "bullmq";
import { redisBull } from "@/constants/redis";
import { MENU_PLAN_QUEUE } from "../queue/menuplan.queue";
import { menuPlanJobSchema } from "@/jobs/types/menuplan.type";
import { updateMenuPlan } from "@/services/repositories/menu.plan.service";
import { createMenuPlan } from "@/services/repositories/web/v2/menu-plan/menu.plan.v2.service";
import { processStatus } from "@/messaging/publishers/notification.publisher";

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

        await processStatus.completed({
          entityType: "MENU_PLAN",
          entityId: result.dailyReports?.[0]?.id,
          kitchenId: input.kitchenId!,
          jobId: job.id,
          date: input.dates,
          result: { planId: result.dailyReports?.[0]?.id, totalReports: result.dailyReports.length },
          message: `Menu plan berhasil dibuat untuk tanggal ${input.dates}`,
          progress: 100,
          status: "QUEUED",
          timestamp: ""
        });
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

        await processStatus.completed({
          entityType: "MENU_PLAN",
          entityId: result?.id,
          kitchenId: input.kitchenId!,
          jobId: job.id,
          date: input.dates,
          result: { planId: result?.id, totalReports: 1 },
          message: `Menu plan berhasil dibuat untuk tanggal ${input.dates}`,
          progress: 100,
          status: "QUEUED",
          timestamp: ""
        });
        return { status: "updated", result };
      }

      console.warn("⚠ Unknown menu plan job type:", input.type);
      return { skipped: true };

    } catch (error: any) {

      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        await job.remove();
        return { skipped: true };
      }

      if (job.attemptsMade < job.opts.attempts!) {
        throw error;
      }

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