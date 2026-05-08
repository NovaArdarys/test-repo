import { ETAUnit } from "../types/autoDelivery";
import calcNodeDistance from "./calcNodeDistance";
import { addMinutes } from "date-fns";
import { DeliveryUnit } from "../types/domain";

export interface PickupETA {
  startTime: Date; // kapan driver BERANGKAT menuju stop pickup ini
  eta: Date;       // kapan driver TIBA untuk ambil tray
}

export interface CalcPickupETAOpts {
  pickupOffsetHours: number;       // jam setelah eta dropoff pertama (default 5)
  speedKmPerHour: number;
  handlingMinutesPerStop: number;
}

/**
 * Kalkulasi ETA pengambilan tray (PICKUP) secara chained.
 *
 * Logika:
 *   - Target tiba di stop pickup pertama = eta_dropoff_stop_pertama + pickupOffsetHours
 *   - Driver berangkat dari dapur  = targetTiba - travel(dapur→A)
 *   - Route: dapur → A → B → C  (identik dengan dropoff route, bukan dapur per-stop)
 *
 * Contoh (offset 5 jam, speed 30 km/h, handling 15 mnt):
 *   Dropoff A = 08:00  →  Target pickup A = 13:00
 *   travel(dapur→A) = 35 mnt  →  driver berangkat 12:25
 *   startTime A = 12:25,  eta A = 13:00
 *   startTime B = 13:15 (13:00 + 15 mnt handling),  eta B = 13:25 (+ 10 mnt travel A→B)
 *
 * @param dropoffUnits - ETAUnit[] dropoff driver (sudah ada .eta per stop)
 * @param opts
 */
export default function calcPickupETAs(
  dropoffUnits: ETAUnit[],
  opts: CalcPickupETAOpts
): PickupETA[] {
  if (!dropoffUnits.length) return [];

  const speedKmPerMinute = opts.speedKmPerHour / 60;
  const offsetMinutes    = opts.pickupOffsetHours * 60;

  // Target tiba di stop pickup PERTAMA = eta dropoff pertama + offset
  const firstPickupTarget = addMinutes(dropoffUnits[0].eta, offsetMinutes);

  // Hitung waktu berangkat dari dapur untuk pickup
  const firstUnit      = dropoffUnits[0];
  const firstDist      = calcNodeDistance(null, firstUnit, firstUnit.kitchenLat!, firstUnit.kitchenLon!);
  const firstTravel    = firstDist / speedKmPerMinute;

  let currentTime: Date = addMinutes(firstPickupTarget, -firstTravel);
  let prevNode: DeliveryUnit | null = null;

  return dropoffUnits.map(unit => {
    const dist          = calcNodeDistance(prevNode, unit, unit.kitchenLat!, unit.kitchenLon!);
    const travelDuration = dist / speedKmPerMinute;

    const departureTime = currentTime;
    const arrivalTime   = addMinutes(currentTime, travelDuration);

    // Berangkat ke stop berikutnya setelah handling
    currentTime = addMinutes(arrivalTime, opts.handlingMinutesPerStop);
    prevNode    = unit;

    return { startTime: departureTime, eta: arrivalTime };
  });
}
