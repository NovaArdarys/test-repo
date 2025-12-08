import { Queue } from "bullmq";
import { redisBull } from "@/constants/redis";
import type { MenuPlanJob } from "@/jobs/types/menuplan.type";

export const MENU_PLAN_QUEUE = "menu-plan";

export const menuPlanQueue = new Queue<MenuPlanJob>(MENU_PLAN_QUEUE, {
  connection: redisBull,
});
