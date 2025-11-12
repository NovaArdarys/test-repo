import { db } from '@/db';
import {
  dailyReports,
  deliveries,
  deliverySchools,
  driverLocations,
  drivers,
  kitchens,
  masterSteps,
  menuPlans,
  menuPlanSchools,
  schools,
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
    const [kitchen] = await tx
      .select()
      .from(kitchens)
      .where(eq(kitchens.id, data.kitchenId));

    if (!kitchen) throw new Error('Kitchen not found');

    const allDrivers = await tx
      .select()
      .from(drivers)
      .where(eq(drivers.kitchenId, data.kitchenId));

    if (!allDrivers.length) throw new Error('No drivers available for kitchen');

    const menuPlan = await tx.query.menuPlans.findFirst({
      where: (mp, { eq }) => eq(mp.id, data.menuPlanId),
    });

    if (!menuPlan) throw new Error("Menu plan not found");

    const planSchools = await tx
      .select({
        schoolId: menuPlanSchools.schoolId,
        menuPlanId: menuPlanSchools.menuPlanId,
        lat: schools.lat,
        lon: schools.lon,
        name: schools.name,
      })
      .from(menuPlanSchools)
      .innerJoin(schools, eq(menuPlanSchools.schoolId, schools.id))
      .where(eq(menuPlanSchools.menuPlanId, data.menuPlanId));

    if (!planSchools.length && menuPlan)
      throw new Error('No schools found for this menu plan');

    const sortedSchools = planSchools
      .map((s) => ({
        ...s,
        distance: distance(Number(kitchen?.lat ?? 0),
          Number(kitchen?.lon ?? 0),
          Number(s.lat ?? 0),
          Number(s.lon ?? 0)),
      }))
      .sort((a, b) => a.distance - b.distance);

    const assignments: Record<string, typeof sortedSchools> = {};
    allDrivers.forEach((d) => (assignments[d.id] = []));

    sortedSchools.forEach((school, index) => {
      const driver = allDrivers[index % allDrivers.length];
      assignments[driver.id].push(school);
    });

    const stepsTemplate = await planEntity("driver");
    const deliveriesResult = [];
    const AVERAGE_SPEED_KMH = 30;
    const BUFFER_MINUTES = 10;

    for (const driver of allDrivers) {
      const assigned = assignments[driver.id];
      if (!assigned.length) continue;

      const totalDistance = assigned.reduce((sum, s) => sum + (s.distance ?? 0), 0);
      const estimatedMinutes = Math.round(
        (totalDistance / AVERAGE_SPEED_KMH) * 60 + BUFFER_MINUTES
      );
      const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);

      // INSERT DELIVERY
      const [newDelivery] = await tx
        .insert(deliveries)
        .values({
          kitchenId: data.kitchenId,
          driverId: driver.id,
          startTime: new Date(),
          estimatedDeliveryTime,
          notes: `Pengiriman ${menuPlan.name}`,
          status: data.status || "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
          deliveryDate: menuPlan.planStartDate,
        })
        .returning();

      const deliverySchoolsBatch = assigned.map((s) => ({
        deliveryId: newDelivery.id,
        schoolId: s.schoolId,
        menuPlanId: s.menuPlanId,
        createdBy: data.createdBy,
      }));
      const insertedSchools = await tx
        .insert(deliverySchools)
        .values(deliverySchoolsBatch)
        .returning();

      // DAILY REPORTS
      const dailyReportsBatch = insertedSchools.map((ds) => ({
        date: format(new Date(), "yyyy-MM-dd"),
        entityId: ds.id,
        entityType: "driver" as const,
        menuPlanId: ds.menuPlanId,
        createdAt: new Date(),
        createdBy: driver.userId,
      }));
      const insertedDailyReports = await tx
        .insert(dailyReports)
        .values(dailyReportsBatch)
        .returning();

      // STEP REPORTS (flat insert)
      const stepReportsBatch = insertedDailyReports.flatMap((dr) =>
        stepsTemplate.map((step) => ({
          dailyReportId: dr.id,
          stepId: step.id,
          isCompleted: false,
          createdBy: driver.userId,
        }))
      );
      await tx.insert(stepReports).values(stepReportsBatch);

      // DRIVER LOCATION
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
        schools: insertedSchools,
        location: newLocation,
      });
    }


    return deliveriesResult;
  });
}
