import type { CreateRoleInput } from "../../schemas";

export const initialRolesData: (CreateRoleInput)[] = [
  {
    name: 'Superadmin',
    description: 'Memiliki akses penuh ke semua resource dan fitur.',
    isDeleted: false,
    createdBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
    updatedBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
    updatedAt: new Date(),
  },
  {
    name: 'Admin',
    description: 'Hanya memiliki akses untuk mengelola pengguna (CRUD Users).',
    isDeleted: false,
    createdBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
    updatedBy: '3be0d800-aa40-459d-82b0-afc7fa8bc252',
    updatedAt: new Date(),
  },
];
