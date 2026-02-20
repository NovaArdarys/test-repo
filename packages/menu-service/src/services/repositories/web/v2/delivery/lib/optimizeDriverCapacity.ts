import { DeliveryUnit, DriverRow } from "../types/domain";

export function optimizeDriverCapacity(
  clusters: DeliveryUnit[][],
  drivers: DriverRow[]
) {

  // sort cluster by total portion DESC
  const sortedClusters = clusters
    .slice()
    .sort((a, b) => {
      const porA = a.reduce((sum, u) => sum + u.portion, 0);
      const porB = b.reduce((sum, u) => sum + u.portion, 0);
      return porB - porA;
    });

  // sort drivers by capacity DESC
  const sortedDrivers = drivers
    .slice()
    .sort((a, b) => {
      return (b.portionCapacity ?? 0) - (a.portionCapacity ?? 0);
    });

  const mapping: Record<string, DeliveryUnit[]> = {};

  for (let i = 0; i < sortedDrivers.length; i++) {
    mapping[sortedDrivers[i].id] = [];
  }

  let driverIndex = 0;

  for (const cluster of sortedClusters) {
    const units = cluster;
    let assigned = false;

    while (!assigned) {
      const driver = sortedDrivers[driverIndex];
      const remaining = driver.portionCapacity ?? 0;

      const totalPortion = units.reduce((s, u) => s + u.portion, 0);

      if (remaining >= totalPortion) {
        mapping[driver.id].push(...units);
        driver.portionCapacity = remaining - totalPortion;
        assigned = true;
      } else {
        // split cluster if too large
        const partial: DeliveryUnit[] = [];
        let runningPortion = 0;

        for (const u of units) {
          if (runningPortion + u.portion <= remaining) {
            partial.push(u);
            runningPortion += u.portion;
          }
        }

        mapping[driver.id].push(...partial);

        driver.portionCapacity = remaining - runningPortion;

        const leftover = units.filter(
          u => !partial.includes(u)
        );

        units.splice(0, units.length, ...leftover);
      }

      driverIndex++;
      if (driverIndex >= sortedDrivers.length) driverIndex = 0;
    }
  }

  return mapping;
}
