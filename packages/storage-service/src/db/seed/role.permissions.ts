import { db } from "..";
import { permissions, rolePermissions, roles } from "../schemas";
import { initialPermissionsData } from "./data/initialPermissionsData";
import { initialRolesData } from "./data/initialRoleData";

export async function runRolePermissionSeeder() {
  console.log('[SEED] Starting Role and Permission Seeding...');
  let rolePermissionMappingsCount = 0;

  try {
    await db.transaction(async (tx) => {

      const now = new Date();
      const rolesToInsert = initialRolesData.map(r => ({
        name: r.name,
        description: r.description,
        isDeleted: r.isDeleted,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        createdAt: now,
        updatedAt: now,
      }));

      const rolesToinsert = await tx
        .insert(roles)
        .values(rolesToInsert).returning({
          id: roles.id,
          name: roles.name,
        });
      console.log('[SEED] Roles (Superadmin, Admin) seeded successfully.');


      const permissionsToInsert = initialPermissionsData.map(p => ({
        name: p.name,
        type: p.type,
        resource: p.resource,
        action: p.action,
        createdBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
        updatedBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
        createdAt: now,
        updatedAt: now,
      }));

      const insertedPermissions = await tx
        .insert(permissions)
        .values(permissionsToInsert)
        .returning({
          id: permissions.id,
          resource: permissions.resource,
          action: permissions.action
        });

      console.log(`[SEED] Permissions seeded successfully. New permissions inserted: ${insertedPermissions.length}`);


      // 3. Seed Role-Permissions (Mapping)
      if (insertedPermissions.length > 0) {
        for (const role of rolesToinsert) {
          for (const permission of insertedPermissions) {
            const data = await tx
              .insert(rolePermissions)
              .values({
                permissionId: permission.id,
                roleId: role.id,
                isDeleted: false,
                createdAt: new Date(),
                createdBy: "00000000-0000-0000-0000-000000000000"
              }).returning();
            rolePermissionMappingsCount = data.length;
          }
        }

      } else {
        console.log('[SEED] Skipping role_permissions mapping as no new permissions were inserted.');
      }

      console.log(`[SEED] Role-Permission mappings completed. Total relationships added: ${rolePermissionMappingsCount}.`);
    });

    console.log('[SEED] Role and Permission Seeding process finished successfully.');
    return { success: true, mappingsCount: rolePermissionMappingsCount };

  } catch (error) {
    console.error('[SEED ERROR] Seeding transaction failed:', error);
    throw new Error('Full Role and Permission Seeding failed.');
  }
}

runRolePermissionSeeder();
