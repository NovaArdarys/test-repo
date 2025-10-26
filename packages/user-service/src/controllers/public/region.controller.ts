import { Context } from 'hono';
import { catchAsync } from '@/utils/catchAsync'; // Asumsi utilitas Anda
import * as RegionService from '@/services/repositories/region.service'; // Asumsi path ke Region Service

/**
 * Handler untuk mengambil daftar semua Provinsi.
 * @route GET /regions/provinces
 */
export const listProvincesHandler = catchAsync(async (c: Context) => {
  const provinces = await RegionService.getAllProvinces();

  return c.json({ data: provinces }, 200);
});

/**
 * Handler untuk mengambil daftar Kabupaten/Kota berdasarkan ID Provinsi.
 * @route GET /regions/regencies?province_id={uuid}
 */
export const listRegenciesHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const provinceId = query.provinceId;

  if (!provinceId) {
    return c.json({ error: 'Missing required query parameter: province_id' }, 400);
  }

  const regencies = await RegionService.getRegenciesByProvince(provinceId);

  return c.json({ data: regencies }, 200);
});

/**
 * Handler untuk mengambil daftar Kecamatan berdasarkan ID Kabupaten/Kota.
 * @route GET /regions/districts?regency_id={uuid}
 */
export const listDistrictsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const regencyId = query.regencyId;

  if (!regencyId) {
    return c.json({ error: 'Missing required query parameter: regency_id' }, 400);
  }

  const districts = await RegionService.getDistrictsByRegency(regencyId);

  return c.json({ data: districts }, 200);
});

/**
 * Handler untuk mengambil daftar Desa/Kelurahan berdasarkan ID Kecamatan.
 * @route GET /regions/villages?district_id={uuid}
 */
export const listVillagesHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const districtId = query.districtId;

  if (!districtId) {
    return c.json({ error: 'Missing required query parameter: district_id' }, 400);
  }

  const villages = await RegionService.getVillagesByDistrict(districtId);

  return c.json({ data: villages }, 200);
});