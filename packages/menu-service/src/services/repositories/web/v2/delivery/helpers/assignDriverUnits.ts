import clusterUnits from "../lib/clusterUnits";
import { optimizeDriverCapacity } from "../lib/optimizeDriverCapacity";
import { DeliveryUnit, DriverAssignments, DriverRow } from "../types/domain";

export default function assignDriverUnits(
  units: DeliveryUnit[],
  drivers: DriverRow[]
): DriverAssignments {

  // cluster berdasarkan jarak
  const clusters = clusterUnits(units, 5); // radius cluster 5km

  // optimasi kapasitas driver
  const assignments = optimizeDriverCapacity(clusters, drivers);

  // sorting + orderIndex di dalam setiap driver
  for (const driverId in assignments) {

    assignments[driverId] = assignments[driverId]
      .sort((a, b) => {
        // SMALL → LARGE
        if (a.type === "SMALL" && b.type === "LARGE") return -1;
        if (a.type === "LARGE" && b.type === "SMALL") return 1;

        // WAKTU ASCENDING
        if (a.deliveryTime! < b.deliveryTime!) return -1;
        if (a.deliveryTime! > b.deliveryTime!) return 1;

        // JARAK ASCENDING
        return (a.distance ?? 0) - (b.distance ?? 0);
      })
      .map((unit, index) => ({
        ...unit,
        driverId,
        orderIndex: index
      }));
  }

  return assignments;
}


export function assignDriverUnitsWithRefill(
  units: DeliveryUnit[],
  drivers: DriverRow[]
): DriverAssignments {

  // ========================================
  // init hasil + kapasitas awal
  // ========================================
  const result: DriverAssignments = {};
  const driverCapacity: Record<string, number> = {};
  const driverTripCounter: Record<string, number> = {};

  for (const d of drivers) {
    result[d.id] = [];
    driverCapacity[d.id] = d.portionCapacity ?? 0;
    driverTripCounter[d.id] = 0;
  }

  // ========================================
  // urutkan units by:
  //    time → SMALL first → distance
  // ========================================
  const sortedUnits = units.slice().sort((a, b) => {
    if (a.deliveryTime! < b.deliveryTime!) return -1;
    if (a.deliveryTime! > b.deliveryTime!) return 1;

    if (a.type === "SMALL" && b.type === "LARGE") return -1;
    if (a.type === "LARGE" && b.type === "SMALL") return 1;

    return (a.distance ?? 0) - (b.distance ?? 0);
  });

  // ========================================
  // loop driver + refill model
  // ========================================
  let driverIndex = 0;

  for (const unit of sortedUnits) {

    let remaining = unit.portion;

    while (remaining > 0) {

      const driver = drivers[driverIndex];
      const capacity = driverCapacity[driver.id];

      // jika kosong => refill driver
      if (capacity <= 0) {
        driverTripCounter[driver.id] += 1;
        driverCapacity[driver.id] = driver.portionCapacity ?? 0;
      }

      const available = driverCapacity[driver.id];
      if (available <= 0) {
        driverIndex = (driverIndex + 1) % drivers.length;
        continue;
      }

      // berapa yang bisa dibawa di trip ini
      const served = Math.min(remaining, available);

      // assign
      result[driver.id].push({
        ...unit,
        portion: served,
        driverId: driver.id,
        trip: driverTripCounter[driver.id],
      });

      // update porsi & kapasitas
      driverCapacity[driver.id] -= served;
      remaining -= served;

      // next driver kalau masih sisa
      if (remaining > 0) {
        driverIndex = (driverIndex + 1) % drivers.length;
      }
    }
  }

  // ========================================
  // assign orderIndex + globalOrderIndex
  // ========================================
  let globalIndex = 0;

  for (const driverId in result) {
    result[driverId] = result[driverId]
      .sort((a, b) => {
        // trip ASC
        if ((a.trip ?? 0) < (b.trip ?? 0)) return -1;
        if ((a.trip ?? 0) > (b.trip ?? 0)) return 1;

        // time ASC
        if (a.deliveryTime! < b.deliveryTime!) return -1;
        if (a.deliveryTime! > b.deliveryTime!) return 1;

        // SMALL → LARGE
        if (a.type === "SMALL" && b.type === "LARGE") return -1;
        if (a.type === "LARGE" && b.type === "SMALL") return 1;

        // distance
        return (a.distance ?? 0) - (b.distance ?? 0);
      })
      .map((u, i) => ({
        ...u,
        orderIndex: i,
        globalOrderIndex: globalIndex++,
      }));
  }

  return result;
}

