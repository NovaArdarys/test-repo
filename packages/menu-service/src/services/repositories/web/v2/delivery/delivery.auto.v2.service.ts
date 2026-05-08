import { db } from "@/db";
import {
  CreateAutoDeliveryInput,
  DeliveryResult,
  DeliveryUnit,
  Trx
} from "./types/domain";

import fetchKitchen from "./helpers/fetcher/fetchKitchen";
import fetchMenuPlan from "./helpers/fetcher/fetchMenuPlan";
import fetchBeneficiaries from "./helpers/fetcher/fetchBeneficiaries";
import fetchDrivers from "./helpers/fetcher/fetchDrivers";

import expandUnits from "./helpers/expandUnits";
import { assignDriverUnitsWithRefill } from "./helpers/assignDriverUnits";
import processSingleDriver from "./helpers/processSingleDriver";
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
  const kitchen      = await fetchKitchen(trx, data.kitchenId);
  const menuPlan     = await fetchMenuPlan(trx, data.menuPlanId);
  const beneficiaries = await fetchBeneficiaries(trx, data.menuPlanId);
  const drivers = (await fetchDrivers(trx, data.kitchenId))
    .filter(d => d.portionCapacity && d.portionCapacity > 0);

  console.log(`[AutoDelivery] Kitchen ${data.kitchenId} has ${drivers.length} valid drivers:`, 
    drivers.map(d => ({ id: d.id, email: d.userId, cap: d.portionCapacity }))
  );

  if (!drivers.length) {
    throw new Error("Tidak ada driver dengan kapasitas valid");
  }

  const units = expandUnits(beneficiaries, kitchen, menuPlan);
  console.log(`[AutoDelivery] expandUnits → ${units.length} units (${units.filter(u=>u.type==='SMALL').length} SMALL, ${units.filter(u=>u.type==='LARGE').length} LARGE)`);

  const clustered = clusterUnits(units, 5);
  const flattenedCluster = clustered.flat();
  console.log(`[AutoDelivery] clusterUnits → ${clustered.length} clusters, ${flattenedCluster.length} total units`);

  // ── Shuffle drivers for start-position fairness ────────────────────────
  const shuffledDrivers = drivers.slice().sort(() => Math.random() - 0.5);

  const assignments = assignDriverUnitsWithRefill(flattenedCluster, shuffledDrivers);
  for (const [dId, uList] of Object.entries(assignments)) {
    console.log(`[AutoDelivery] driver ${dId} → ${uList.length} units`);
  }

  const flattenedUnits: DeliveryUnit[] = Object.values(assignments)
    .flat()
    .sort((a, b) => a.globalOrderIndex! - b.globalOrderIndex!);

  const etaUnits = calcClusterETAs(flattenedUnits, 30, 15, menuPlan.planStartDate);
  console.log(`[AutoDelivery] etaUnits → ${etaUnits.length}`);

  // 6. Insert deliveries — one pass per driver, directly using processSingleDriver
  const results: DeliveryResult[] = [];

  for (const driver of drivers) {
    const driverUnits = etaUnits.filter(u => u.driverId === driver.id);
    if (!driverUnits.length) continue;

    const deliveries = await processSingleDriver(trx, {
      data,
      drivers,
      assignments,
      units: driverUnits,
      kitchen,
      menuPlan,
      driver,
      trx,
    });

    results.push(...deliveries);
  }

  return results;
}
