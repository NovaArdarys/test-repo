import { db } from "@/db";
import {
  menuPlans,
  kitchens,
  drivers,
  beneficiaries,
  deliveries,
  menuPlanBeneficiaries
} from "@/db/schemas";
import { InferSelectModel } from "drizzle-orm";

export type MenuPlan = InferSelectModel<typeof menuPlans>;
export type KitchenRow = InferSelectModel<typeof kitchens>;
export type DriverRow = InferSelectModel<typeof drivers>;
export type BeneficiaryRow = InferSelectModel<typeof beneficiaries>;
export type MenuPlanBeneficiariesRow = InferSelectModel<typeof menuPlanBeneficiaries>;
export type DeliveryRow = InferSelectModel<typeof deliveries>;
export type MenuPlanRow = InferSelectModel<typeof menuPlans>;

/**
 * Merged row for delivery planning: fields from menuPlanBeneficiaries
 * enriched with real coordinates from the beneficiaries table.
 * lat/lon come from the junction table when explicitly set (not '0'),
 * otherwise fall back to beneficiaries.lat/lon.
 */
export interface BeneficiaryDeliveryRow {
  id: string;
  menuPlanId: string;
  beneficiaryId: string;
  smallPortion: number | null;
  largePortion: number | null;
  smallDeliveryTime: string | null;
  largeDeliveryTime: string | null;
  lat: string | null;
  lon: string | null;
  isDeleted: boolean;
  createdAt: Date;
  createdBy: string | null;
}

export interface DeliveryUnit {
  clusterId: number;
  beneficiaryId: string;
  menuPlanId: string;
  portion: number;
  type: "SMALL" | "LARGE";
  orderIndex: number;
  lat?: string | null;
  lon?: string | null;
  kitchenLat?: string | null;
  kitchenLon?: string | null;
  deliveryDate: string;
  deliveryTime?: string;
  distance?: number | null;
  driverId?: string | null;
  driverRemainingCapacity?: number;
  trip?: number;
  globalOrderIndex?: number;
}

export type DriverAssignments = Record<string, DeliveryUnit[]>;

export interface DeliveryResult extends DeliveryRow { }

export type Trx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateAutoDeliveryInput {
  kitchenId: string;
  menuPlanId: string;
  status?: string;
  createdBy: string;
}
