import { catchAsync } from '@/utils/catchAsync';
import { getBeneficiaryList } from '@/services/repositories/beneficiary.service';
import { generateExcelBuffer, excelResponse } from '@/utils/excel.util';
import { isArray, uniq } from 'lodash';
import { format } from 'date-fns';

const EXPORT_LIMIT = 10_000;

export const exportBeneficiariesHandler = catchAsync(async (c) => {
  const query = c.req.query();

  const isAppManager = c.get('isAppManager') as boolean;
  const kitchenId = c.get('kitchenId') as string[];

  const result = await getBeneficiaryList({
    page: 1,
    limit: EXPORT_LIMIT,
    name: query.name || undefined,
    status: query.status || undefined,
    isAppManager,
    kitchenIds: uniq([...(isArray(kitchenId) ? kitchenId : [])]),
  });

  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nama Penerima', key: 'name', width: 30 },
    { header: 'Alamat', key: 'address', width: 40 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'No. Telepon', key: 'phoneNumber', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Latitude', key: 'lat', width: 16 },
    { header: 'Longitude', key: 'lon', width: 16 },
    { header: 'Tanggal Bergabung', key: 'joinedDate', width: 20 },
    { header: 'Email User Sekolah', key: 'userEmails', width: 30 },
  ];

  const rows = result.data.map((b: any) => ({
    name: b.name ?? '-',
    address: b.address ?? '-',
    category: b.category ?? '-',
    phoneNumber: b.phoneNumber ?? '-',
    status: b.status === 'AKTIF' ? 'Aktif' : 'Tidak Aktif',
    lat: b.lat ?? '-',
    lon: b.lon ?? '-',
    joinedDate: b.joinedDate ? format(new Date(b.joinedDate), 'dd/MM/yyyy') : '-',
    userEmails: (b.userBeneficiaries ?? [])
      .filter((ub: any) => ub.user?.isActive === true)
      .map((ub: any) => ub.user?.email)
      .filter(Boolean)
      .join(', ') || '-',
  }));

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const buffer = await generateExcelBuffer(columns, rows, 'Data Penerima Manfaat');
  return excelResponse(c, buffer, `master_penerima_${timestamp}.xlsx`);
});
