import { DeliveryUnit } from "../types/domain";

export default function clusterUnits(
  units: DeliveryUnit[],
  clusterSizeKm: number
): DeliveryUnit[][] {

  if (!units.length) return [];

  const clusters: DeliveryUnit[][] = [];
  let currentCluster: DeliveryUnit[] = [];

  // sort by distance ascending
  const sorted = units.slice().sort((a, b) => {
    return (a.distance ?? 0) - (b.distance ?? 0);
  });

  let baseDistance = sorted[0].distance ?? 0;
  let clusterIndex = 0;

  for (const unit of sorted) {
    const dist = unit.distance ?? 0;

    if (dist - baseDistance > clusterSizeKm) {
      // assign clusterId to previous cluster
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
