import { beneficiaries, kitchens, menuPlans } from "@/db/schemas";
import { InferSelectModel } from "drizzle-orm";

export interface Trx {
  insert: Function;
  select: Function;
  update?: Function;
  delete?: Function;
  [key: string]: any;
}

export type MenuPlan = InferSelectModel<typeof menuPlans>;


export type Beneficiary = InferSelectModel<typeof beneficiaries>;
export type Kitchen = InferSelectModel<typeof kitchens>;

export interface DailyReport {
  id: string;
  [key: string]: unknown;
}

export type PortionType = "SMALL" | "LARGE" | "DEFAULT";
