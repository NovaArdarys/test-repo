import { DeliveryUnit } from "../types/domain";
import calcDistance from "./calcDistanc";

export default function calcNodeDistance(
  prev: DeliveryUnit | null,
  curr: DeliveryUnit,
  kitchenLat: string,
  kitchenLon: string
): number {

  if (!prev) {
    // first node — distance from kitchen
    return calcDistance(
      kitchenLat,
      kitchenLon,
      curr.lat ?? null,
      curr.lon ?? null
    );
  }

  // next nodes — distance prev → curr
  return calcDistance(
    prev.lat ?? null,
    prev.lon ?? null,
    curr.lat ?? null,
    curr.lon ?? null
  );
}
