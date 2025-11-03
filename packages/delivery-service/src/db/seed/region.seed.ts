// seed.ts
import { v4 as uuidv4 } from 'uuid';
import { provinces, regencies, districts, villages } from '../schemas/master.schema';
import { db } from '../index';
import { region } from './data/regionData';

interface IdMap {
  [kode: string]: string;
}

const BATCH_SIZE = 500;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

async function seedRegionalData() {
  console.log('Starting regional data seeding...');

  const idMap: IdMap = {};

  const provincesToInsert: typeof provinces.$inferInsert[] = [];
  const regenciesToInsert: typeof regencies.$inferInsert[] = [];
  const districtsToInsert: typeof districts.$inferInsert[] = [];
  const villagesToInsert: typeof villages.$inferInsert[] = [];

  for (const item of region.region) {
    const { kode, nama } = item;
    const parts = kode.split('.');
    const id = uuidv4();

    idMap[kode] = id;

    const level = parts.length;

    const parentKode = parts.slice(0, level - 1).join('.');
    const parentId = idMap[parentKode];

    switch (level) {
      case 1:
        provincesToInsert.push({
          id,
          name: nama,
        });
        break;

      case 2:
        if (!parentId) {
          console.error(`Missing parent ID for regency: ${nama} (${kode})`);
          continue;
        }
        regenciesToInsert.push({
          id,
          provinceId: parentId,
          name: nama,
        });
        break;

      case 3:
        if (!parentId) {
          console.error(`Missing parent ID for district: ${nama} (${kode})`);
          continue;
        }
        districtsToInsert.push({
          id,
          regencyId: parentId,
          name: nama,
        });
        break;

      case 4:
        if (!parentId) {
          console.error(`Missing parent ID for village: ${nama} (${kode})`);
          continue;
        }
        villagesToInsert.push({
          id,
          districtId: parentId,
          name: nama,
        });
        break;

      default:
        console.warn(`Skipping unknown region level: ${kode}`);
    }
  }

  // 1. Provinces
  if (provincesToInsert.length > 0) {
    await db.insert(provinces).values(provincesToInsert);
    console.log(`Seeded ${provincesToInsert.length} provinces.`);
  }

  // 2. Regencies
  if (regenciesToInsert.length > 0) {
    await db.insert(regencies).values(regenciesToInsert);
    console.log(`Seeded ${regenciesToInsert.length} regencies.`);
  }

  // 3. Districts
  if (districtsToInsert.length > 0) {
    await db.insert(districts).values(districtsToInsert);
    console.log(`Seeded ${districtsToInsert.length} districts.`);
  }

  // 4. Villages
  const villageBatches = chunkArray(villagesToInsert, BATCH_SIZE);
  console.log(`Seeding ${villagesToInsert.length} villages in ${villageBatches.length} batches...`);

  for (const batch of villageBatches) {
    await db.insert(villages).values(batch);
  }
  console.log(`Seeded ${villagesToInsert.length} villages.`);
  console.log('Regional data seeding complete.');
}

seedRegionalData();