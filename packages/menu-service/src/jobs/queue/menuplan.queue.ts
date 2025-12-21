import { Queue } from "bullmq";
import { redisBull } from "@/constants/redis";
import type { MenuPlanJob } from "@/jobs/types/menuplan.type";

export const MENU_PLAN_QUEUE = "menu-plan";

export const menuPlanQueue = new Queue<MenuPlanJob>(MENU_PLAN_QUEUE, {
  connection: redisBull,

  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: {
      age: 3600,
      count: 1000
    },
    removeOnFail: {
      age: 86400
    },
  },


  // group control
  streams: {
    events: {
      maxLen: 10000,
    },
  },
});
