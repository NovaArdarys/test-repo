import { db } from "@/db";
import {
  CreateAutoDeliveryInput,
  DeliveryResult,
  DeliveryUnit,
  Trx
} from "./types/domain";

import fetchKitchen from "./helpers/fetcher/fetchKitchen";
import fetchMenuPlan from "./helpers/fetchMenuPlan";
import fetchBeneficiaries from "./helpers/fetcher/fetchBeneficiaries";
import fetchDrivers from "./helpers/fetcher/fetchDrivers";

import expandUnits from "./helpers/expandUnits";
import { assignDriverUnitsWithRefill } from "./helpers/assignDriverUnits";
import processDriverAssignments from "./helpers/processDriverAssignments";
import clusterUnits from "./lib/clusterUnits";
import calcClusterETAs from "./lib/calcClusterETAs";

export async function createAutoDelivery(
  data: CreateAutoDeliveryInput,
  trx: Trx | undefined,
) {
  if (trx) {
    return await executeAutoDelivery(trx, data);
  }

  return await db.transaction(async trx => {
    return await executeAutoDelivery(trx, data);
  });
}

async function executeAutoDelivery(
  trx: Trx,
  data: CreateAutoDeliveryInput
) {
  const kitchen = await fetchKitchen(trx, data.kitchenId);
  const menuPlan = await fetchMenuPlan(trx, data.menuPlanId);
  const beneficiaries = await fetchBeneficiaries(trx, data.menuPlanId);
  const drivers = (await fetchDrivers(trx, data.kitchenId))
    .filter(d => d.portionCapacity && d.portionCapacity > 0);
  console.log({ kitchen, menuPlan, beneficiaries, drivers });

  if (!drivers.length) {
    throw new Error("Tidak ada driver dengan kapasitas valid");
  }

  const units = expandUnits(beneficiaries, kitchen, menuPlan);

  const clustered = clusterUnits(units, 5);

  const flattenedCluster = clustered.flat();

  const assignments = assignDriverUnitsWithRefill(flattenedCluster, drivers);

  const flattenedUnits: DeliveryUnit[] = Object.values(assignments)
    .flat()
    .sort((a, b) => a.orderIndex! - b.orderIndex!);

  const etaUnits = calcClusterETAs(flattenedUnits, 30, 15);

  const results: DeliveryResult[] = [];

  for (const driver of drivers) {
    const driverUnits = etaUnits.filter(u => u.driverId === driver.id);

    if (!driverUnits.length) continue;

    const deliveries = await processDriverAssignments(trx, {
      data,
      drivers,
      assignments,
      units: driverUnits,
      kitchen,
      menuPlan,
    });

    results.push(...deliveries);
  }

  return results;
}
