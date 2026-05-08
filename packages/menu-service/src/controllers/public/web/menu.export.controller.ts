import { catchAsync } from '@/utils/catchAsync';
import { getMenuPlansList } from '@/services/repositories/menu.plan.service';
import { generateExcelBuffer, excelResponse } from '@/utils/excel.util';
import { format } from 'date-fns';

const EXPORT_LIMIT = 10_000;

function toGrams(qty: string, unit: string): number {
  const num = parseFloat(qty || '0');
  if (!unit) return 0;
  const u = unit.toLowerCase();
  if (u === 'kg') return num * 1000;
  if (u === 'g' || u === 'gram') return num;
  return num;
}

export const exportFoodWasteHandler = catchAsync(async (c) => {
  const query = c.req.query();
  const kitchenId = c.get('kitchenId') as string[];
  const beneficiaryId = c.get('beneficiaryId') as string[];

  // Accept month+year or startDate+endDate directly
  let startDate = query.startDate || null;
  let endDate = query.endDate || null;

  if (!startDate && query.month && query.year) {
    const year = Number(query.year);
    const month = Number(query.month);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  }

  const result = await getMenuPlansList({
    page: 1,
    limit: EXPORT_LIMIT,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    status: query.status || undefined,
    villageId: '',
    kitchenIds: Array.isArray(kitchenId) ? kitchenId : [],
    schoolIds: Array.isArray(beneficiaryId) ? beneficiaryId : [],
    entityType: 'kitchen',
    menuPlanName: '',
  });

  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'date', width: 16 },
    { header: 'Nama Menu', key: 'menuName', width: 30 },
    { header: 'Item Makanan', key: 'foodItems', width: 40 },
    { header: 'Total Limbah (gram)', key: 'totalWasteGram', width: 20 },
    { header: 'Catatan Limbah', key: 'wasteNote', width: 35 },
    { header: 'Alasan Limbah', key: 'wasteReason', width: 35 },
  ];

  const rows = result.data.map((plan: any) => {
    const foodItemNames = (plan.foodItems || [])
      .map((f: any) => f.name)
      .filter(Boolean)
      .join(', ');

    const totalWasteGram = (plan.foodItems || []).reduce((sum: number, f: any) => {
      return sum + toGrams(f.foodWaste?.quantity || '0', f.foodWaste?.unit || '');
    }, 0);

    return {
      date: plan.date ? format(new Date(plan.date), 'dd/MM/yyyy') : '-',
      menuName: plan.name ?? '-',
      foodItems: foodItemNames || '-',
      totalWasteGram,
      wasteNote: plan.foodWasteNote ?? '-',
      wasteReason: plan.foodWasteReason ?? '-',
    };
  });

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const buffer = await generateExcelBuffer(columns, rows, 'Data Daur Ulang');
  return excelResponse(c, buffer, `master_daur_ulang_${timestamp}.xlsx`);
});

export const exportMenuPlansHandler = catchAsync(async (c) => {
  const query = c.req.query();
  const kitchenId = c.get('kitchenId') as string[];
  const beneficiaryId = c.get('beneficiaryId') as string[];

  // Accept month+year or startDate+endDate directly
  let startDate = query.startDate || null;
  let endDate = query.endDate || null;

  if (!startDate && query.month && query.year) {
    const year = Number(query.year);
    const month = Number(query.month);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  }

  const result = await getMenuPlansList({
    page: 1,
    limit: EXPORT_LIMIT,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    status: query.status || undefined,
    villageId: '',
    kitchenIds: Array.isArray(kitchenId) ? kitchenId : [],
    schoolIds: Array.isArray(beneficiaryId) ? beneficiaryId : [],
    entityType: 'kitchen',
    menuPlanName: '',
  });

  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'date', width: 16 },
    { header: 'Nama Menu', key: 'menuName', width: 30 },
    { header: 'Daftar Makanan', key: 'foodItems', width: 60 },
  ];

  const rows = result.data.map((plan: any) => {
    const foodItemNames = (plan.foodItems || [])
      .map((f: any) => `${f.name} (${f.type || '-'})`)
      .filter(Boolean)
      .join(', ');

    return {
      date: plan.date ? format(new Date(plan.date), 'dd/MM/yyyy') : '-',
      menuName: plan.name ?? '-',
      foodItems: foodItemNames || '-',
    };
  });

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const buffer = await generateExcelBuffer(columns, rows, 'Data Master Menu');
  return excelResponse(c, buffer, `master_menu_${timestamp}.xlsx`);
});
