export interface Trx {
  insert: Function;
  select: Function;
  update?: Function;
  delete?: Function;
  [key: string]: any;
}

export interface MenuPlan {
  id: string;
  kitchenId: string;
  createdAt: string;
  createdBy: string;
  planStartDate: string;
}

export interface Beneficiary {
  id: string;
  smallPortion?: number | null;
  largePortion?: number | null;
  smallDeliveryTime?: string | null;
  largeDeliveryTime?: string | null;
}

export interface DailyReport {
  id: string;
  [key: string]: unknown;
}

export type PortionType = "SMALL" | "LARGE" | "DEFAULT";
