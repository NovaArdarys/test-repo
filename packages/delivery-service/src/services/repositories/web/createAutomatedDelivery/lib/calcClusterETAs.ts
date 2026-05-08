import { ETAUnit } from "../types/autoDelivery";
import { DeliveryUnit } from "../types/domain";
import calcETAs from "./calcETAs";

export default function calcClusterETAs(
  units: DeliveryUnit[],
  speedKmPerHour: number,
  handlingMinutesPerStop: number,
  baseDate: string
) {

  const clusters = units.reduce<Record<number, DeliveryUnit[]>>((acc, u) => {
    if (u.clusterId == null) return acc;
    if (!acc[u.clusterId]) acc[u.clusterId] = [];
    acc[u.clusterId].push(u);
    return acc;
  }, {});

  const results: ETAUnit[] = [];

  for (const clusterId in clusters) {
    const etaUnits = calcETAs(clusters[clusterId], {
      speedKmPerHour,
      handlingMinutesPerStop,
    }, baseDate);

    etaUnits.forEach(u => results.push(u));
  }

  return results;
}
