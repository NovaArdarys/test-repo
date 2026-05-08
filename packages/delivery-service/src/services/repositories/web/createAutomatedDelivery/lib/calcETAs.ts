import calcNodeDistance from "./calcNodeDistance";
import { DeliveryUnit } from "../types/domain";
import { ETAOptions, ETAUnit } from "../types/autoDelivery";
import { addMinutes } from "date-fns";
import parseStartTime from "./parseStartTime";

/**
 * Kalkulasi per-stop ETA untuk daftar delivery units yang sudah diurutkan.
 *
 * Semantik kolom:
 *   startTime             = kapan driver BERANGKAT menuju stop ini
 *                           (dari dapur untuk stop pertama, dari stop sebelumnya untuk berikutnya)
 *   eta (estimatedDeliveryTime) = kapan driver TIBA di beneficiary
 *                           = startTime + travelDuration
 *
 * `deliveryTime` pada unit adalah TARGET TIBA (mis. "08:00"), bukan waktu berangkat.
 * Untuk stop pertama: driver berangkat dari dapur = targetArrival - firstTravelDuration
 *
 * Timeline contoh (1 driver, 2 stop, speed 30 km/h, handling 15 mnt):
 *   targetArrival   = 08:00
 *   kitchen→stop1   = 35 mnt  → driver berangkat 07:25
 *   stop1 startTime = 07:25   → eta stop1 = 08:00  ✓
 *   stop1 departure = 08:00 + 15 mnt handling = 08:15
 *   stop1→stop2     = 10 mnt  → stop2 startTime = 08:15 → eta stop2 = 08:25
 */
export default function calcETAs(
  units: DeliveryUnit[],
  opts: ETAOptions,
  baseDate: string
): ETAUnit[] {

  if (!units.length) return [];

  const results: ETAUnit[] = [];
  const speedKmPerMinute = opts.speedKmPerHour / 60;

  // targetArrivalTime = jam yang dituju untuk tiba di stop pertama (= deliveryTime config)
  const targetArrivalTime = parseStartTime(units, baseDate);

  // Hitung jarak dapur → stop pertama untuk menentukan kapan driver harus berangkat
  const firstUnit = units[0];
  const firstDist = calcNodeDistance(null, firstUnit, firstUnit.kitchenLat!, firstUnit.kitchenLon!);
  const firstTravelDuration = firstDist / speedKmPerMinute;

  // Waktu berangkat dari dapur = targetArrival - firstTravelDuration
  let currentTime = addMinutes(targetArrivalTime, -firstTravelDuration);

  let prevNode: DeliveryUnit | null = null;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];

    // Jarak: dapur→stop pertama, atau stop_sebelumnya→stop_ini
    const dist = calcNodeDistance(
      prevNode,
      unit,
      unit.kitchenLat!,
      unit.kitchenLon!
    );

    const travelDuration = dist / speedKmPerMinute;

    const departureTime = currentTime;                              // driver berangkat
    const arrivalTime   = addMinutes(currentTime, travelDuration); // driver tiba

    results.push({
      ...unit,
      startTime: departureTime, // kapan driver berangkat menuju stop ini
      eta:        arrivalTime,  // kapan driver tiba (= estimated_delivery_time)
      legDistance: dist,
      legDurationMinutes: travelDuration + opts.handlingMinutesPerStop,
    });

    // Berikutnya: driver berangkat setelah handling selesai
    currentTime = addMinutes(arrivalTime, opts.handlingMinutesPerStop);
    prevNode = unit;
  }

  return results;
}
