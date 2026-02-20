import calcDistance from "../lib/calcDistanc";
import {
  DeliveryUnit,
  MenuPlanBeneficiariesRow,
  MenuPlanRow,
  KitchenRow
} from "../types/domain";

export default function expandUnits(
  menuPlanBeneficiariesRow: MenuPlanBeneficiariesRow[],
  kitchen: KitchenRow,
  menuPlan: MenuPlanRow
): DeliveryUnit[] {

  const units: DeliveryUnit[] = [];

  for (const b of menuPlanBeneficiariesRow) {

    if (b.smallPortion && b.smallPortion > 0) {
      units.push({
        clusterId: -1,
        beneficiaryId: b.beneficiaryId,
        menuPlanId: menuPlan.id,
        portion: b.smallPortion,
        type: "SMALL",
        deliveryTime: b.smallDeliveryTime ?? "07:00",
        distance: calcDistance(kitchen.lat, kitchen.lon, b.lat, b.lon),
        lat: b.lat,
        lon: b.lon,
        kitchenLat: kitchen.lat,
        kitchenLon: kitchen.lon,
        orderIndex: 0
      });
    }

    if (b.largePortion && b.largePortion > 0) {
      units.push({
        clusterId: -1,
        beneficiaryId: b.beneficiaryId,
        menuPlanId: menuPlan.id,
        portion: b.largePortion,
        type: "LARGE",
        deliveryTime: b.largeDeliveryTime ?? "09:00",
        distance: calcDistance(kitchen.lat, kitchen.lon, b.lat, b.lon),
        lat: b.lat,
        lon: b.lon,
        kitchenLat: kitchen.lat,
        kitchenLon: kitchen.lon,
        orderIndex: 0
      });
    }
  }

  return units;
}
