import { db } from '@/db';
import {
  deliveries,
  deliverySchools,
  driverLocations,
  drivers,
  kitchens,
  menuPlans,
  menuPlanSchoolsKitchen,
  schools,
} from '@/db/schemas';
import { eq, InferInsertModel } from 'drizzle-orm';

interface CreateAutoDeliveryInput {
  kitchenId: string;
  menuPlanId: string;
  createdBy: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED';
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

    const planSchools = await tx
      .select({
        schoolId: menuPlanSchoolsKitchen.schoolId,
        menuPlanId: menuPlanSchoolsKitchen.menuPlanId,
        lat: schools.lat,
        lon: schools.lon,
        name: schools.name,
      })
      .from(menuPlanSchoolsKitchen)
      .innerJoin(schools, eq(menuPlanSchoolsKitchen.schoolId, schools.id))
      .where(eq(menuPlanSchoolsKitchen.menuPlanId, data.menuPlanId));

    if (!planSchools.length)
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

    const deliveriesResult = [];

    for (const driver of allDrivers) {
      const assigned = assignments[driver.id];
      if (!assigned.length) continue;

      const [newDelivery] = await tx
        .insert(deliveries)
        .values({
          kitchenId: data.kitchenId,
          driverId: driver.id,
          startTime: new Date(),
          estimatedDeliveryTime: null,
          notes: `Pengiriman untuk ${schools.name}`,
          status: data.status || 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        })
        .returning();

      const deliverySchoolsResult = await Promise.all(
        assigned.map((s) =>
          tx
            .insert(deliverySchools)
            .values({
              deliveryId: newDelivery.id,
              schoolId: s.schoolId,
              menuPlanId: s.menuPlanId,
              createdBy: data.createdBy,
              status: 'PENDING',
            })
            .returning()
        )
      );

      const [newLocation] = await tx
        .insert(driverLocations)
        .values({
          driverId: driver.id,
          deliveryId: newDelivery.id,
          lat: kitchen?.lat?.toString() ?? "0",
          lon: kitchen?.lon?.toString() ?? "0",
          createdBy: data.createdBy,
        })
        .returning();

      deliveriesResult.push({
        delivery: newDelivery,
        deliverySchools: deliverySchoolsResult.map((r) => r[0]),
        location: newLocation,
      });
    }

    return deliveriesResult;
  });
}
