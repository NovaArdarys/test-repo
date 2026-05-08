import { catchAsync } from '@/utils/catchAsync';
import { getUsersList } from '@/services/repositories/user.detail.service';
import { generateExcelBuffer, excelResponse } from '@/utils/excel.util';
import { userSortMapper } from '@/services/mappers/user.order.mapper';
import { format } from 'date-fns';

const EXPORT_LIMIT = 10_000;

function buildOrderBy(sortQuery: string | undefined, mapper: Record<string, any>) {
  if (!sortQuery) return [];
  return sortQuery
    .split(',')
    .map((item) => {
      const [col, dir] = item.split(':');
      const column = col?.trim();
      const direction = dir?.trim() === 'desc' ? 'desc' : 'asc';
      return column && mapper[column] ? mapper[column](direction) : null;
    })
    .filter(Boolean);
}

export const exportUsersHandler = catchAsync(async (c) => {
  const query = c.req.query();

  const isAppManager = c.get('isAppManager') as boolean;
  const userId = c.get('userId') as string;

  const orderBy = buildOrderBy(query.sort, userSortMapper);

  // Convert isActive string -> boolean | undefined
  let isActive: boolean | undefined;
  if (query.isActive === 'true') isActive = true;
  else if (query.isActive === 'false') isActive = false;

  const result = await getUsersList({
    page: 1,
    limit: EXPORT_LIMIT,
    isActive,
    name: query.name || undefined,
    role: (query.role && query.role !== '-') ? query.role : undefined,
    email: query.name || undefined,
    isAppManager,
    author: userId,
    orderBy,
  });

  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Nama Lengkap', key: 'fullName', width: 28 },
    { header: 'No. Telepon', key: 'phoneNumber', width: 18 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Tanggal Dibuat', key: 'createdAt', width: 20 },
  ];

  const rows = result.data.map((u: any) => {
    const detail = (u.userDetails as any) ?? {};
    const roleName = u.userRoles?.[0]?.role?.name ?? '-';
    return {
      email: u.email,
      fullName: `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim() || '-',
      phoneNumber: detail.phoneNumber ?? '-',
      role: roleName,
      status: u.isActive ? 'Aktif' : 'Tidak Aktif',
      createdAt: u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy HH:mm') : '-',
    };
  });

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const buffer = await generateExcelBuffer(columns, rows, 'Data User');
  return excelResponse(c, buffer, `master_user_${timestamp}.xlsx`);
});
