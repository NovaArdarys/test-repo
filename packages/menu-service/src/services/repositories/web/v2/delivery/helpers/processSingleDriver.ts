import { Trx, } from "../types/domain";
import { ProcessSingleDriverArgs, DeliveryResult } from "../types/autoDelivery";
import resolveDriverDailyReport from "./resolveDriverDailyReport";

import insertDeliveryBeneficiary from "./insertDeliveryBeneficiary";
import insertDeliveryDropoff from "./insertDeliveryDropoff";
import insertPickupDelivery from "./insertDeliveryPickup";
import insertDeliveryStepReports from "./insertDeliveryStepReports";
import insertDriverLocation from "./insertDriverLocation";
import insertDriverStepReports from "./insertDriverStepReports";

import { deliveries } from "@/db/schemas";
import { eq } from "drizzle-orm";
import generateDeliveryMarkdownFull, { MdDeliveryLog } from "../lib/testing-purpose/generateDeliveryMarkdownFull";

export default async function processSingleDriver(
  trx: Trx,
  args: ProcessSingleDriverArgs
): Promise<DeliveryResult[]> {

  const results: DeliveryResult[] = [];
  const dailyReportMap: Record<string, Record<string, string>> = {};


  // LOOP UNITS DENGAN INDEX
  for (let i = 0; i < args.units.length; i++) {
    const unit = args.units[i];

    //
    // PICKUP CREATE
    //
    const pickup = await insertPickupDelivery(trx, args, unit);

    await insertDriverLocation(trx, args, pickup);
    await insertDeliveryStepReports(trx, pickup.id, args.data.createdBy);

    //
    // DROPOFF CREATE
    //
    const delivery = await insertDeliveryDropoff(trx, args, unit);

    const beneficiaryRecord = await insertDeliveryBeneficiary(
      trx,
      args,
      delivery,
      unit
    );

    await insertDeliveryStepReports(
      trx,
      beneficiaryRecord.id,
      args.data.createdBy
    );

    //
    // ASSIGN ETA KE DROPOFF DELIVERY
    //
    await trx.update(deliveries)
      .set({ estimatedDeliveryTime: unit.eta })
      .where(eq(deliveries.id, delivery.id));

    //
    // REPORTS
    //
    const dailyReportId = await resolveDriverDailyReport(
      trx,
      args,
      beneficiaryRecord,
      unit,
      dailyReportMap
    );

    await insertDriverStepReports(trx, args, dailyReportId);
    await insertDriverLocation(trx, args, delivery);

    //
    // ADD RESULT SET
    //
    results.push(pickup, delivery);
  }

  return results;
}

export async function processSingleDriverSimulated(
  args: ProcessSingleDriverArgs
): Promise<MdDeliveryLog[]> {

  const results: MdDeliveryLog[] = [];

  for (let i = 0; i < args.units.length; i++) {
    const unit = args.units[i];

    //
    // SIMULATED PICKUP
    //
    const pickup: MdDeliveryLog = {
      deliveryId: `SIM-${args.driver.id}-${unit.beneficiaryId}-P`,
      driverId: args.driver.id,
      beneficiaryId: unit.beneficiaryId,
      orderIndex: unit.orderIndex * 2,
      clusterId: unit.clusterId ?? 0,
      eta: unit.eta ?? null,
      distance: unit.distance ?? null,
      portion: unit.portion,
      type: unit.type,
      lat: unit.lat ?? null,
      lon: unit.lon ?? null
    };

    //
    // SIMULATED DROPOFF
    //
    const dropoff: MdDeliveryLog = {
      deliveryId: `SIM-${args.driver.id}-${unit.beneficiaryId}-D`,
      driverId: args.driver.id,
      beneficiaryId: unit.beneficiaryId,
      orderIndex: unit.orderIndex * 2 + 1,
      clusterId: unit.clusterId ?? 0,
      eta: unit.eta ?? null,
      distance: unit.distance ?? null,
      portion: unit.portion,
      type: unit.type,
      lat: unit.lat ?? null,
      lon: unit.lon ?? null
    };

    results.push(pickup, dropoff);
  }

  //
  // GENERATE MARKDOWN OUTPUT
  //
  generateDeliveryMarkdownFull(results, {
    driverName: args.driver.userId,
    kitchenId: args.kitchen.id,
    menuPlanId: args.menuPlan.id,
  });

  return results;
}
