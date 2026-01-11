import { Trx, } from "../types/domain";
import { ProcessSingleDriverArgs, DeliveryResult } from "../types/autoDelivery";
import resolveDriverDailyReport from "./insert/insertDriverDailyReport";

import insertDeliveryBeneficiary from "./insert/insertDeliveryBeneficiary";
import insertDeliveryDropoff from "./insert/insertDeliveryDropoff";
import insertPickupDelivery from "./insert/insertDeliveryPickup";
import insertDeliveryStepReports from "./insert/insertDeliveryStepReports";
import insertDriverLocation from "./insert/insertDriverLocation";
import insertDriverStepReports from "./insert/insertDriverStepReports";

import { deliveries } from "@/db/schemas";
import { eq } from "drizzle-orm";
import generateDeliveryMarkdownFull, { MdDeliveryLog } from "../lib/testing-purpose/generateDeliveryMarkdownFull";

export default async function processSingleDriver(
  trx: Trx,
  args: ProcessSingleDriverArgs
): Promise<DeliveryResult[]> {

  const results: DeliveryResult[] = [];
  const dailyReportMap: Record<string, Record<string, string>> = {};

  for (let i = 0; i < args.units.length; i++) {
    const unit = args.units[i];

    //
    // PICKUP DELIVERY
    //
    const pickup = await insertPickupDelivery(trx, args, unit);
    await insertDriverLocation(trx, args, pickup);

    //
    // DROPOFF DELIVERY
    //
    const delivery = await insertDeliveryDropoff(trx, args, unit);
    await insertDriverLocation(trx, args, delivery);

    //
    // BENEFICIARY - PICKUP (TRAY)
    //
    const beneficiaryPickupRecord = await insertDeliveryBeneficiary(
      trx,
      args,
      pickup,
      unit
    );

    //
    // BENEFICIARY - DROPOFF (FOOD)
    //
    const beneficiaryDropOffRecord = await insertDeliveryBeneficiary(
      trx,
      args,
      delivery,
      unit
    );

    //
    // STEP REPORTS
    //
    await insertDeliveryStepReports(trx, beneficiaryPickupRecord.id, args.data.createdBy);
    await insertDeliveryStepReports(trx, beneficiaryDropOffRecord.id, args.data.createdBy);

    //
    // ETA
    //
    await trx.update(deliveries)
      .set({ estimatedDeliveryTime: unit.eta })
      .where(eq(deliveries.id, delivery.id));

    // Driver dengan 1 unit → 1 daily report + 1 step report

    // Driver dengan >1 unit, tapi same portionType → 1 daily report + 1 step report

    // Driver dengan >1 unit, beda portionType → 1 daily report per portionType

    if (!dailyReportMap[args.driver.id]?.[unit.type]) {
      const dailyReportId = await resolveDriverDailyReport(trx, args, args.driver, unit, dailyReportMap);
      await insertDriverStepReports(trx, args, dailyReportId);
    }
    //
    // RETURN RESULT
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
