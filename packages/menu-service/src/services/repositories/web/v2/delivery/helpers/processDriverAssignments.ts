import { Trx } from "../types/domain";
import { DeliveryResult, ProcessDriverArgs } from "../types/autoDelivery";
import processSingleDriver, { processSingleDriverSimulated } from "./processSingleDriver";

export default async function processDriverAssignments(
  trx: Trx,
  args: ProcessDriverArgs
): Promise<DeliveryResult[]> {

  const results: DeliveryResult[] = [];

  for (const driver of args.drivers) {

    const driverUnits = args.units.filter(u => u.driverId === driver.id);

    console.log(driverUnits, driver, "====masuk=====");
    if (!driverUnits.length) continue;

    const deliveries = await processSingleDriver(trx, {
      ...args,
      trx,
      driver,
      units: driverUnits,
    });

    await processSingleDriverSimulated({
      ...args,
      trx,
      driver,
      units: driverUnits,
    });

    results.push(...deliveries);
  }

  return results;
}
