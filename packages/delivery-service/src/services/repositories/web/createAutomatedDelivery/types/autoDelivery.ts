import {
  DriverAssignments,
  DriverRow,
  DeliveryUnit,
  KitchenRow,
  MenuPlanRow,
  DeliveryResult,
  CreateAutoDeliveryInput
} from "./domain";


export interface ETAUnit extends DeliveryUnit {
  eta: Date;
  legDistance: number;
  legDurationMinutes: number;
}

export interface ETAOptions {
  speedKmPerHour: number;          // rata-rata speed driver
  handlingMinutesPerStop: number;  // waktu berhenti per lokasi (dropoff)
}


export interface ProcessDriverArgs {
  assignments: DriverAssignments;
  drivers: DriverRow[];
  data: CreateAutoDeliveryInput;
  kitchen: KitchenRow;
  menuPlan: MenuPlanRow;
  units: ETAUnit[];
}

export interface ProcessSingleDriverArgs extends ProcessDriverArgs {
  driver: DriverRow;
  units: ETAUnit[];
  trx: any;
}

export type { DeliveryResult };
