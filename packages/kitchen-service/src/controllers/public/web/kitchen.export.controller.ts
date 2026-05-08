import { catchAsync } from '@/utils/catchAsync';
import { getKitchensList } from '@/services/repositories/kitchen.service';
import { generateExcelBuffer, excelResponse } from '@/utils/excel.util';
import { kitchenSortMapper } from '@/services/mappers/kitchen.mapper';
import { isArray, uniq } from 'lodash';
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

export const exportKitchensHandler = catchAsync(async (c) => {
  const query = c.req.query();

  const isAppManager = c.get('isAppManager') as boolean;
  const kitchenId = c.get('kitchenId') as string[];

  const orderBy = buildOrderBy(query.sort, kitchenSortMapper);

  const result = await getKitchensList({
    page: 1,
    limit: EXPORT_LIMIT,
    name: query.name || undefined,
    status: query.status || undefined,
    kitchenIds: uniq([...(isArray(kitchenId) ? kitchenId : [])]),
    isAppManager,
    orderBy,
  });

  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nama Dapur', key: 'name', width: 30 },
    { header: 'Alamat', key: 'address', width: 40 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Latitude', key: 'lat', width: 16 },
    { header: 'Longitude', key: 'lon', width: 16 },
    { header: 'Tanggal Dibuat', key: 'createdAt', width: 20 },
  ];

  const rows = result.data.map((k: any) => ({
    name: k.name ?? '-',
    address: k.address ?? '-',
    status: k.status === 'AKTIF' ? 'Aktif' : 'Tidak Aktif',
    lat: k.lat ?? '-',
    lon: k.lon ?? '-',
    createdAt: k.createdAt ? format(new Date(k.createdAt), 'dd/MM/yyyy HH:mm') : '-',
  }));

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const buffer = await generateExcelBuffer(columns, rows, 'Data Dapur');
  return excelResponse(c, buffer, `master_dapur_${timestamp}.xlsx`);
});
