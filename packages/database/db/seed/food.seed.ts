import { randomUUID } from 'crypto';
import { db } from '..';
import { foodItems } from '../schemas';
import { foodData } from './data/foodData';

async function seedFoodItems() {
  const userId = '00000000-0000-0000-0000-000000000001';

  console.log('🌱 Starting seeding for food items...');

  try {
    // Cek apakah sudah ada data
    const existing = await db.query.foodItems.findMany();

    if (existing.length > 0) {
      console.log(`✅ Food items already exist (${existing.length} records), skipping.`);
      return;
    }

    // Insert data
    const result = await db.insert(foodItems).values(
      foodData.map((item) => ({
        id: randomUUID(),
        name: item.name,
        nameEn: item.nameEn,
        type: item.type,
        description: item.description,
        descriptionEn: item.descriptionEn,
        isAvailable: true,
        isDeleted: false,
        createdBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
        ingredients: [], // Default empty array for ingredients
      }))
    );

    console.log(`🎉 Successfully seeded ${foodData.length} food items!`);
  } catch (error) {
    console.error('❌ Error seeding food items:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seedFoodItems()
    .then(() => {
      console.log('✅ Seed script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed script failed:', err);
      process.exit(1);
    });
}

export { seedFoodItems };