import { DeliveryUnit, DriverAssignments, DriverRow } from "../types/domain";

/**
 * Assign delivery units to drivers using a Trip-based Proportional distribution.
 */
export function assignDriverUnitsWithRefill(
  units: DeliveryUnit[],
  drivers: DriverRow[],
): DriverAssignments {

  if (!drivers.length) {
    console.warn("[assignDriverUnits] No drivers provided for assignment");
    return {};
  }

  console.log(`[assignDriverUnits] Starting assignment for ${units.length} units with ${drivers.length} drivers`);

  // ── init ─────────────────────────────────────────────────────────────────
  const result: DriverAssignments = {};
  const tripCounter: Record<string, number> = {};

  for (const d of drivers) {
    result[d.id]      = [];
    tripCounter[d.id] = 0;
  }

  // ── sort: deliveryTime ASC → SMALL first → distance ASC ─────────────────
  const sortedUnits = units.slice().sort((a, b) => {
    if (a.deliveryTime! < b.deliveryTime!) return -1;
    if (a.deliveryTime! > b.deliveryTime!) return 1;
    if (a.type === "SMALL" && b.type === "LARGE") return -1;
    if (a.type === "LARGE" && b.type === "SMALL") return 1;
    return (a.distance ?? 0) - (b.distance ?? 0);
  });

  // ── helper: pick driver by least loaded ratio ────────────────────────────
  function pickDriver(): DriverRow {
    return drivers.reduce((best, d) => {
      const portionsBest = result[best.id].reduce((s, u) => s + u.portion, 0);
      const portionsD    = result[d.id].reduce((s, u) => s + u.portion, 0);
      
      const ratioBest = portionsBest / (best.portionCapacity || 1);
      const ratioD    = portionsD / (d.portionCapacity || 1);
      
      if (ratioD === ratioBest) {
        return (d.portionCapacity || 0) > (best.portionCapacity || 0) ? d : best;
      }
      return ratioD < ratioBest ? d : best;
    });
  }

  // ── assignment loop (Parallel-First with Beneficiary-Grouping) ──────────
  const queue = [...sortedUnits];
  let currentTripLevel = 0;

  while (queue.length > 0) {
    let assignedAnyInThisLevel = false;

    for (const driver of drivers) {
      if (queue.length === 0) break;

      const capacity = driver.portionCapacity ?? 0;
      let currentTripLoad = result[driver.id]
        .filter(u => u.trip === currentTripLevel)
        .reduce((s, u) => s + u.portion, 0);

      if (currentTripLoad >= capacity) continue;

      let startedNewSchoolInThisIteration = false;

      // Iterate through the queue to find units for this driver
      let i = 0;
      while (i < queue.length) {
        const unit = queue[i];

        // 1. Skip if already has this type for this school
        const alreadyHasThisType = result[driver.id].some(
          u => u.beneficiaryId === unit.beneficiaryId && u.type === unit.type
        );
        if (alreadyHasThisType) { i++; continue; }

        // 2. Check if we already started a visit to this school in THIS trip
        const handlesThisSchoolInThisTrip = result[driver.id].some(
          u => u.beneficiaryId === unit.beneficiaryId && u.trip === currentTripLevel
        );

        // 3. Parallel-First Constraint: 
        // Only start a NEW school if we haven't started one in this inner loop iteration.
        // But if we already handle this school, we can keep adding portions to it.
        if (!handlesThisSchoolInThisTrip && startedNewSchoolInThisIteration) {
          i++; 
          continue; 
        }

        // 4. Try to take the portion
        if (currentTripLoad + unit.portion <= capacity) {
          result[driver.id].push({
            ...unit,
            driverId: driver.id,
            trip: currentTripLevel,
          });
          currentTripLoad += unit.portion;
          queue.splice(i, 1);
          assignedAnyInThisLevel = true;
          
          if (!handlesThisSchoolInThisTrip) {
            startedNewSchoolInThisIteration = true;
          }
          // Stay at the same index to check the next item (which shifted down)
          continue; 
        } else {
          // Splitting logic if it doesn't fit
          const canTake = capacity - currentTripLoad;
          if (canTake > 0) {
            result[driver.id].push({
              ...unit,
              portion: canTake,
              driverId: driver.id,
              trip: currentTripLevel,
            });
            unit.portion -= canTake;
            currentTripLoad += canTake;
            assignedAnyInThisLevel = true;
            if (!handlesThisSchoolInThisTrip) startedNewSchoolInThisIteration = true;
          }
          // Driver trip is full, or cannot take more
          break; 
        }
      }
    }

    if (!assignedAnyInThisLevel) {
      // All drivers full for current trip level, or units cannot fit in anyone
      currentTripLevel++;
      
      // Safety break to prevent infinite loops (should not happen with splitting)
      if (currentTripLevel > 100) {
        console.error("[assignDriverUnits] Safety break: Too many trips detected.");
        break;
      }
    }
  }

  // Update tripCounter for summary
  for (const dId in result) {
    const maxTrip = result[dId].reduce((max, u) => Math.max(max, u.trip ?? 0), 0);
    tripCounter[dId] = maxTrip;
  }

  // ── global order ─────────────────────────────────────────────────────────
  let globalIndex = 0;
  for (const dId in result) {
    result[dId] = result[dId]
      .sort((a, b) => {
        if ((a.trip ?? 0) < (b.trip ?? 0)) return -1;
        if ((a.trip ?? 0) > (b.trip ?? 0)) return 1;
        return 0; // maintain original unit sort within trip
      })
      .map((u, i) => ({
        ...u,
        orderIndex: i,
        globalOrderIndex: globalIndex++,
      }));
  }

  const summary = Object.fromEntries(
    Object.entries(result).map(([id, list]) => [
      id, 
      { 
        portions: list.reduce((s, u) => s + u.portion, 0),
        trips: (tripCounter[id] || 0) + 1
      }
    ])
  );
  console.log("[assignDriverUnits] Assignment complete:", summary);

  return result;
}
