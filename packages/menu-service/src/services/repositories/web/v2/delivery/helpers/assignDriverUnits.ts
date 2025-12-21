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
