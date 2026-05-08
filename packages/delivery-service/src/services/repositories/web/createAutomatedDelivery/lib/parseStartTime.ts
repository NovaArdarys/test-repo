import { DeliveryUnit } from "../types/domain";

export default function parseStartTime(
  units: DeliveryUnit[],
  baseDateStr: string,
  fallbackHour = 7
): Date {

  const [year, month, day] = baseDateStr.split("-").map(n => parseInt(n));

  const first = units.find(u => u.deliveryTime);

  if (!first || !first.deliveryTime) {
    const d = new Date(year, month - 1, day, fallbackHour, 0, 0, 0);
    return d;
  }

  const timeParts = first.deliveryTime.split(":").map(n => parseInt(n));

  const h = timeParts[0] ?? fallbackHour;
  const m = timeParts[1] ?? 0;
  const s = timeParts[2] ?? 0;

  const d = new Date(year, month - 1, day, h, m, s, 0);

  return d;
}
