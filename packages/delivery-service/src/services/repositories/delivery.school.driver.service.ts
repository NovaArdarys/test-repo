import { db } from '@/db';
import {
  deliveries,
  deliverySchools,
  driverLocations,
} from '@/db/schemas';
import { InferInsertModel } from 'drizzle-orm';

type DeliveryInsert = InferInsertModel<typeof deliveries>;
type DeliverySchoolInsert = InferInsertModel<typeof deliverySchools>;
type DriverLocationInsert = InferInsertModel<typeof driverLocations>;

interface NewDelivery
  extends Omit<DeliveryInsert, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'status'> {
  status?: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED';
  schools: Omit<DeliverySchoolInsert, 'id' | 'deliveryId' | 'createdAt'>[];
}

export async function createDelivery(data: NewDelivery) {
  return await db.transaction(async (tx) => {
    const [newDelivery] = await tx
      .insert(deliveries)
      .values({
        kitchenId: data.kitchenId,
        driverId: data.driverId,
        startTime: data.startTime,
        endTime: data.endTime,
        estimatedDeliveryTime: data.estimatedDeliveryTime,
        notes: data.notes,
        status: data.status || 'PENDING',
        updatedAt: new Date(),
        updatedBy: data.createdBy,
        createdBy: data.createdBy,
        createdAt: new Date(),
      })
      .returning();

    // 2️⃣ Create Delivery Schools
    const newDeliverySchools = await Promise.all(
      data.schools.map((s) =>
        tx
          .insert(deliverySchools)
          .values({
            deliveryId: newDelivery.id,
            schoolId: s.schoolId,
            menuPlanId: s.menuPlanId,
            notes: s.notes,
            createdBy: data.createdBy,
            status: s.status || 'PENDING',
          })
          .returning()
      )
    );

    const [newLocation] = await tx
      .insert(driverLocations)
      .values({
        driverId: data.driverId,
        deliveryId: newDelivery.id,
        lat: '0',
        lon: '0',
        createdBy: data.createdBy,
      })
      .returning();

    return {
      delivery: newDelivery,
      deliverySchools: newDeliverySchools.map((r) => r[0]),
      location: newLocation,
    };
  });
}
