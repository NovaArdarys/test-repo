import { db } from "..";
import { appMenus } from "../schemas";

export async function runAppMenuSeeder() {
  console.log('[SEED] Starting App Menus Seeding...');
  const now = new Date();
  const createdBy = '3be0d800-aa40-459d-82b0-afc7fa8bc252'; // Example superadmin UUID

  try {
    await db.transaction(async (tx) => {
      // 0. Cleanup
      await tx.delete(appMenus);

      // 1. Root Menus
      const dashboard = await tx.insert(appMenus).values({
        name: 'Dashboard',
        path: '/',
        icon: 'LayoutDashboard',
        displayOrder: 1,
        createdBy,
        updatedAt: now,
      }).returning({ id: appMenus.id });

      const master = await tx.insert(appMenus).values({
        name: 'Master',
        path: '#',
        icon: 'Database',
        displayOrder: 2,
        createdBy,
        updatedAt: now,
      }).returning({ id: appMenus.id });

      const laporan = await tx.insert(appMenus).values({
        name: 'Laporan',
        path: '#',
        icon: 'FileText',
        displayOrder: 3,
        createdBy,
        updatedAt: now,
      }).returning({ id: appMenus.id });

      const auditTrail = await tx.insert(appMenus).values({
        name: 'Audit Trail',
        path: '/audit-log',
        icon: 'Shield',
        displayOrder: 4,
        createdBy,
        updatedAt: now,
      }).returning({ id: appMenus.id });

      const notifications = await tx.insert(appMenus).values({
        name: 'Notifications',
        path: '/notifications',
        icon: 'Bell',
        displayOrder: 5,
        createdBy,
        updatedAt: now,
      }).returning({ id: appMenus.id });

      // 2. Master Sub-menus
      await tx.insert(appMenus).values([
        {
          name: 'User Management',
          path: '/master/users',
          parentId: master?.[0]?.id!,
          displayOrder: 1,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Dapur',
          path: '/master/dapur',
          parentId: master?.[0]?.id!,
          displayOrder: 2,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Penerima Manfaat',
          path: '/master/sekolah',
          parentId: master?.[0]?.id!,
          displayOrder: 3,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Menu',
          path: '/master/menu',
          parentId: master?.[0]?.id!,
          displayOrder: 4,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Limbah Makanan',
          path: '/master/food-waste',
          parentId: master?.[0]?.id!,
          displayOrder: 5,
          createdBy,
          updatedAt: now,
        },
      ]);

      // 3. Laporan Sub-menus
      await tx.insert(appMenus).values([
        {
          name: 'Kejadian',
          path: '/laporan/events',
          parentId: laporan?.[0]?.id,
          displayOrder: 1,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Harian',
          path: '/laporan/daily',
          parentId: laporan?.[0]?.id,
          displayOrder: 2,
          createdBy,
          updatedAt: now,
        },
        {
          name: 'Analisa',
          path: '/laporan/ai-chat',
          parentId: laporan?.[0]?.id,
          displayOrder: 3,
          createdBy,
          updatedAt: now,
        },
      ]);
    });

    console.log('[SEED] App Menus seeded successfully.');
    return { success: true };
  } catch (error) {
    console.error('[SEED ERROR] App Menus Seeding failed:', error);
    throw error;
  }
}

runAppMenuSeeder();

