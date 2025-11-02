import { randomUUID } from 'crypto';
import { db } from '..';
import { foodItems } from '../schemas';
import { foodData } from './data/foodData';

async function seedFoodItems() {
  const userId = '00000000-0000-0000-0000-000000000001';

  await db.insert(foodItems).values(
    foodData.map((item) => ({
      id: randomUUID(),
      ...item,
      isAvailable: true,
      isDeleted: false,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: new Date(),
    }))
  );

  console.log('✅ Food items seeded successfully!');
}

seedFoodItems().catch((err) => {
  console.error(err);
  process.exit(1);
});
