import { NonRetryableError } from "bullmq";

export const menuPlanWorker = new Worker(
  MENU_PLAN_QUEUE,
  async (job) => {
    try {
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
      }
    } catch (err: any) {
      console.error("❌ Worker error:", err);

      if (err?.code === "23505" || err?.message?.includes("duplicate key")) {
        throw new NonRetryableError("DB_CONFLICT");
      }

      throw err;
    }
  },
  {
    connection: redisBull,
    concurrency: 1,
    lockDuration: 300000,
    autorun: true,
  }
);
