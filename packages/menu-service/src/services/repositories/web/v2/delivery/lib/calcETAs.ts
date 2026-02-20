import calcNodeDistance from "./calcNodeDistance";
import { DeliveryUnit } from "../types/domain";
import { ETAOptions, ETAUnit } from "../types/autoDelivery";
import { addMinutes } from "date-fns";
import parseStartTime from "./parseStartTime";

export default function calcETAs(
  units: DeliveryUnit[],
  opts: ETAOptions
): ETAUnit[] {

  if (!units.length) return [];

  const results: ETAUnit[] = [];
  const speedKmPerMinute = opts.speedKmPerHour / 60;

  let currentTime = parseStartTime(units);

  let prevNode: DeliveryUnit | null = null;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];

    const dist = calcNodeDistance(
      prevNode,
      unit,
      unit.kitchenLat!,
      unit.kitchenLon!
    );

    const durationMinutes = dist / speedKmPerMinute;

    const arrivalTime = addMinutes(currentTime, durationMinutes + opts.handlingMinutesPerStop);

    results.push({
      ...unit,
      eta: arrivalTime,
      legDistance: dist,
      legDurationMinutes: durationMinutes + opts.handlingMinutesPerStop
    });

    currentTime = arrivalTime;
    prevNode = unit;
  }

  return results;
}
