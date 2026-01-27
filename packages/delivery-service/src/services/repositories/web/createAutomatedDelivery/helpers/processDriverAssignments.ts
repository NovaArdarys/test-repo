import { Trx } from "../types/domain";
import { DeliveryResult, ProcessDriverArgs } from "../types/autoDelivery";
import processSingleDriver, { processSingleDriverSimulated } from "./processSingleDriver";
import { processStatus } from "@/messaging/publishers/notification.publisher";

export default async function processDriverAssignments(
  trx: Trx,
  args: ProcessDriverArgs
): Promise<DeliveryResult[]> {

  const results: DeliveryResult[] = [];

  for (const driver of args.drivers) {

    const driverUnits = args.units.filter(u => u.driverId === driver.id);

    if (!driverUnits.length) continue;

    const deliveries = await processSingleDriver(trx, {
      ...args,
      trx,
      driver,
      units: driverUnits,
    });


    processStatus.completed({
      status: "COMPLETED",
      entityType: "MENU_PLAN",
      entityId: args.menuPlan.id,
      kitchenId: args.kitchen.id,
      beneficiaryId: undefined,
      relatedId: undefined,
      relatedType: undefined,
      jobId: undefined,
      date: new Date().toISOString().split('T')[0],
      progress: 100,
      step: "Berhasil Membuat Menu",
      result: deliveries,
      error: undefined,
      userActorId: args.menuPlan.createdBy,
      userReceivedId: driver.userId,
      title: "Menu Makanan",
      message: `Menu tanggal ${args.menuPlan.planStartDate}`,
      timestamp: new Date().toISOString(),
    });

    results.push(...deliveries);
  }

  return results;
}
