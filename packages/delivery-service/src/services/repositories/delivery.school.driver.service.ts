import { db } from '@/db';
import {
  dailyReports,
  deliveries,
  deliveryBeneficiaries,
  driverLocations,
  drivers,
  kitchens,
  masterSteps,
  menuPlanBeneficiaries,
  beneficiaries,
  stepReports,
} from '@/db/schemas';
import { format } from 'date-fns';
import { eq, InferInsertModel } from 'drizzle-orm';

interface CreateAutoDeliveryInput {
  kitchenId: string;
  menuPlanId: string;
  createdBy: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED';
}

async function planEntity(entityType: string) {
  return db.query.masterSteps.findMany({ where: eq(masterSteps.entityType, entityType as any) });
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createAutoDelivery(data: CreateAutoDeliveryInput) {
  return await db.transaction(async (tx) => {
    const [kitchen] = await tx.select().from(kitchens).where(eq(kitchens.id, data.kitchenId));
    if (!kitchen) throw new Error("Kitchen not found");

    const allDrivers = await tx.select().from(drivers).where(eq(drivers.kitchenId, data.kitchenId));
    if (!allDrivers.length) throw new Error("No drivers available for kitchen");

    const menuPlan = await tx.query.menuPlans.findFirst({
      where: (mp, { eq }) => eq(mp.id, data.menuPlanId),
    });
    if (!menuPlan) throw new Error("Menu plan not found");

    const planBeneficiaries = await tx
      .select({
        beneficiaryId: menuPlanBeneficiaries.beneficiaryId,
        menuPlanId: menuPlanBeneficiaries.menuPlanId,
        lat: beneficiaries.lat,
        lon: beneficiaries.lon,
        name: beneficiaries.name,
        smallPortion: beneficiaries.smallPortion,
        largePortion: beneficiaries.largePortion,
      })
      .from(menuPlanBeneficiaries)
      .innerJoin(beneficiaries, eq(menuPlanBeneficiaries.beneficiaryId, beneficiaries.id))
      .where(eq(menuPlanBeneficiaries.menuPlanId, data.menuPlanId));

    if (!planBeneficiaries.length) throw new Error("No beneficiaries found for this menu plan");

    // jarak dari kitchen
    const sortedBeneficiaries = planBeneficiaries
      .map((b) => ({
        ...b,
        distance: distance(
          Number(kitchen?.lat ?? 0),
          Number(kitchen?.lon ?? 0),
          Number(b.lat ?? 0),
          Number(b.lon ?? 0)
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    // Distribusi ke driver
    const assignments: Record<string, typeof sortedBeneficiaries> = {};
    allDrivers.forEach((d) => (assignments[d.id] = []));
    sortedBeneficiaries.forEach((b, i) => {
      const driver = allDrivers[i % allDrivers.length];
      assignments[driver.id].push(b);
    });

    const stepsTemplate = await planEntity("driver");
    const deliveriesResult = [];
    const AVERAGE_SPEED_KMH = 30;
    const BUFFER_MINUTES = 10;

    for (const driver of allDrivers) {
      const assigned = assignments[driver.id];
      if (!assigned.length) continue;

      for (const beneficiary of assigned) {
        const portionTypes: ("SMALL" | "LARGE" | "DEFAULT")[] = [];

        if (beneficiary.smallPortion && beneficiary.smallPortion > 0) portionTypes.push("SMALL");
        if (beneficiary.largePortion && beneficiary.largePortion > 0) portionTypes.push("LARGE");
        if (portionTypes.length === 0) portionTypes.push("DEFAULT");

        for (const portionType of portionTypes) {
          const totalDistance = beneficiary.distance ?? 0;
          const estimatedMinutes = Math.round((totalDistance / AVERAGE_SPEED_KMH) * 60 + BUFFER_MINUTES);
          const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);

          const [newDelivery] = await tx
            .insert(deliveries)
            .values({
              kitchenId: data.kitchenId,
              driverId: driver.id,
              startTime: new Date(),
              estimatedDeliveryTime,
              notes: `Pengiriman ${menuPlan.name} - ${portionType}`,
              status: data.status || "PENDING",
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: data.createdBy,
              updatedBy: data.createdBy,
              deliveryDate: menuPlan.planStartDate,
              portionType,
              targetPortion: portionType === "SMALL" ? beneficiary?.smallPortion || 0 : portionType === "LARGE" ? beneficiary?.largePortion || 0 : 0,
              endTime: null
            })
            .returning();

          const [insertedBeneficiary] = await tx
            .insert(deliveryBeneficiaries)
            .values({
              deliveryId: newDelivery.id,
              beneficiaryId: beneficiary.beneficiaryId,
              menuPlanId: beneficiary.menuPlanId,
              createdBy: data.createdBy,
            })
            .returning();

          const [newDailyReport] = await tx
            .insert(dailyReports)
            .values({
              date: format(new Date(), "yyyy-MM-dd"),
              entityId: insertedBeneficiary.id,
              entityType: "driver",
              menuPlanId: beneficiary.menuPlanId,
              portionType,
              status: "PENDING",
              createdAt: new Date(),
              createdBy: driver.userId,
            })
            .returning();

          const stepReportsBatch = stepsTemplate.map((step) => ({
            dailyReportId: newDailyReport.id,
            stepId: step.id,
            isCompleted: false,
            createdBy: driver.userId,
          }));
          await tx.insert(stepReports).values(stepReportsBatch);

          const [newLocation] = await tx
            .insert(driverLocations)
            .values({
              driverId: driver.id,
              deliveryId: newDelivery.id,
              lat: kitchen.lat?.toString() ?? "0",
              lon: kitchen.lon?.toString() ?? "0",
              createdBy: driver.userId,
            })
            .returning();

          deliveriesResult.push({
            delivery: newDelivery,
            beneficiary: insertedBeneficiary,
            portionType,
            location: newLocation,
          });
        }
      }
    }

    return deliveriesResult;
  });
}