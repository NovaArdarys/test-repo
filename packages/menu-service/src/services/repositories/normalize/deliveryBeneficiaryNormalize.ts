// src/utils/buildMenuPlanDeliveries.ts

type PortionType = "SMALL" | "LARGE";
type DeliveryType = "PICKUP" | "DROPOFF";

function buildSteps(stepReports: any[]) {
  return stepReports.map((sr) => ({
    id: sr.id,
    isCompleted: sr.step?.isCompleted ?? false,
    imageUrl: sr.step?.imageURL ?? null,
    notes: sr.step?.notes ?? null,
    stepName: sr.step?.masterStep?.stepName,
    stepOrder: sr.step?.masterStep?.stepOrder,
  }));
}

export function buildMenuPlanDeliveries(
  deliveryBeneficiaries: any[]
) {
  const beneficiaryMap = new Map<string, any>();

  for (const row of deliveryBeneficiaries) {
    const beneficiaryId = row.beneficiaryId;
    if (!beneficiaryId) continue;

    if (!beneficiaryMap.has(beneficiaryId)) {
      beneficiaryMap.set(beneficiaryId, {
        id: beneficiaryId,
        name: row.beneficiary.name,
        address: row.beneficiary.address,
        category: row.beneficiary.category,
        imageUrl: row.beneficiary.imageUrl,
        storageId: row.beneficiary.storageId,
        lat: row.beneficiary.lat,
        lon: row.beneficiary.lon,
        phoneNumber: row.beneficiary.phoneNumber,
        joinedDate: row.beneficiary.joinedDate,
        status: row.beneficiary.status,
        portions: [],
      });
    }

    const beneficiaryNode = beneficiaryMap.get(beneficiaryId);
    const delivery = row.delivery;
    if (!delivery) continue;

    const portionType = delivery.portionType as PortionType;

    let portion = beneficiaryNode.portions.find(
      (p: any) => p.portionType === portionType
    );

    if (!portion) {
      portion = {
        portionType,
        targetPortion: delivery.targetPortion,
        receivedPortion: 0,
        takenTray: 0,
        deliveredPortion: 0,
        pickup: null,
        dropoff: null,
      };
      beneficiaryNode.portions.push(portion);
    }

    const deliveryNode = {
      id: delivery.id,
      type: delivery.type,
      status: delivery.status,
      deliveryOrder: delivery.deliveryOrder,
      startTime: delivery.startTime,
      endTime: delivery.endTime,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime,
      notes: delivery.notes,
      driver: delivery.driver
        ? {
          id: delivery.driver.user?.id,
          name: `${delivery.driver.user?.userDetails?.firstName ?? ""} ${delivery.driver.user?.userDetails?.lastName ?? ""
            }`.trim(),
          licenseNumber: delivery.driver.licenseNumber,
          capacity: delivery.driver.portionCapacity,
        }
        : null,
      steps: buildSteps(row.deliveryStepReports ?? []),
    };

    if (delivery.type === "PICKUP") {
      portion.takenTray = delivery.takenTray ?? 0;
      portion.pickup = deliveryNode;
    }

    if (delivery.type === "DROPOFF") {
      portion.receivedPortion = delivery.receivedPortion ?? 0;
      portion.deliveredPortion = delivery.deliveredPortion ?? 0;

      portion.dropoff = deliveryNode;
    }
  }

  return Array.from(beneficiaryMap.values());
}
