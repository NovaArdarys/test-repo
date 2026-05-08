import { DeliveryUnit } from "../types/domain";

/**
 * Cluster units by distance from kitchen.
 * IMPORTANT: SMALL and LARGE units are clustered SEPARATELY because they
 * have different delivery times (07:00 vs 09:00). Mixing them would cause
 * calcETAs to use the wrong start time for one of the groups.
 *
 * Cluster IDs are assigned globally (no overlap between SMALL and LARGE).
 */
export default function clusterUnits(
  units: DeliveryUnit[],
  clusterSizeKm: number
): DeliveryUnit[][] {

  if (!units.length) return [];

  const smallUnits = units.filter(u => u.type === "SMALL");
  const largeUnits = units.filter(u => u.type === "LARGE");

  let nextClusterId = 0;

  const smallClusters = clusterByDistance(smallUnits, clusterSizeKm, nextClusterId);
  nextClusterId += smallClusters.length;

  const largeClusters = clusterByDistance(largeUnits, clusterSizeKm, nextClusterId);

  return [...smallClusters, ...largeClusters];
}

function clusterByDistance(
  units: DeliveryUnit[],
  clusterSizeKm: number,
  startClusterId: number
): DeliveryUnit[][] {

  if (!units.length) return [];

  const clusters: DeliveryUnit[][] = [];
  let currentCluster: DeliveryUnit[] = [];

  // sort by distance ascending
  const sorted = units.slice().sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  let baseDistance = sorted[0].distance ?? 0;
  let clusterIndex = startClusterId;

  for (const unit of sorted) {
    const dist = unit.distance ?? 0;

    if (dist - baseDistance > clusterSizeKm) {
      currentCluster.forEach(u => (u.clusterId = clusterIndex));
      clusters.push(currentCluster);
      currentCluster = [unit];
      baseDistance = dist;
      clusterIndex++;
    } else {
      currentCluster.push(unit);
    }
  }

  // final cluster
  currentCluster.forEach(u => (u.clusterId = clusterIndex));
  clusters.push(currentCluster);

  return clusters;
}
