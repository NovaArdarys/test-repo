import type { InferInsertModel } from "drizzle-orm";
import type { rolePermissions } from "../../schemas";
import { initialRolesData } from "../initialData/initialRoleData";

type NewRolePermission = InferInsertModel<typeof rolePermissions>;

/**
 * Menghasilkan mapping Role-Permission untuk seeding.
 *
 * Fungsi ini mengambil data Permission yang sudah di-insert (dengan ID-nya) 
 * dan menerapkan logika bisnis untuk menentukan izin mana yang dimiliki oleh Role tertentu.
 * * @param insertedPermissions Hasil dari Drizzle insertion yang berisi ID, resource, dan action.
 * @returns Array of objects siap insert ke tabel rolePermissions.
 */
export function getRolePermissionMappings(insertedPermissions: any, insertedRole: any): NewRolePermission[] {

  const userManagementResources = [
    '/api/users',
    '/api/users/details'
  ];

  const allRolePermissions: NewRolePermission[] = [];
  const superadminId = insertedRole.find((r: any) => r.name === 'Superadmin')?.id;
  const adminId = insertedRole.find((r: any) => r.name === 'Admin')?.id;

  // if (!superadminId || !adminId) {
  //   console.error("Role IDs not found in initialRolesData. Seeding rolePermissions skipped.");
  //   return [];
  // }

  const allPermissionIds = insertedPermissions.map((p: any) => p.id);
  allPermissionIds.forEach((permId: any) => {
    allRolePermissions.push({
      roleId: superadminId.toString(),
      permissionId: permId
    });
  });

  const adminPermissionIds = insertedPermissions
    .filter((p: any) => userManagementResources.includes(p.resource))
    .map((p: any) => p.id);

  adminPermissionIds.forEach((permId: any) => {
    allRolePermissions.push({
      roleId: adminId.toString(),
      permissionId: permId
    });
  });

  return allRolePermissions;
}
