import { db } from "@/db"; // Asumsi path ke instance Drizzle ORM Anda // Asumsi utilitas error Anda

type UUID = string;

/**
 * Mengambil semua data provinsi yang tersedia.
 * @returns Array of provinces.
 */
export async function getAllProvinces() {
  const allProvinces = await db.query.provinces
    .findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (provinces, { asc }) => [asc(provinces.name)],
    });

  return allProvinces;
}

/**
 * Mengambil semua kabupaten/kota yang berada di bawah ID provinsi tertentu.
 * @param provinceId UUID dari Provinsi.
 * @returns Array of regencies.
 */
export async function getRegenciesByProvince(provinceId: UUID) {
  const regenciesList = await db.query.regencies
    .findMany({
      columns: {
        id: true,
        name: true,
      },
      where: (regencies, { eq }) => eq(regencies.provinceId, provinceId),
      orderBy: (regencies, { asc }) => [asc(regencies.name)],
    });

  if (!regenciesList || regenciesList.length === 0) {
    return [];
  }

  return regenciesList;
}

/**
 * Mengambil semua kecamatan (districts) yang berada di bawah ID kabupaten/kota tertentu.
 * @param regencyId UUID dari Kabupaten/Kota.
 * @returns Array of districts.
 */
export async function getDistrictsByRegency(regencyId: UUID) {
  const districtsList = await db.query.districts
    .findMany({
      columns: {
        id: true,
        name: true,
      },
      where: (districts, { eq }) => eq(districts.regencyId, regencyId),
      orderBy: (districts, { asc }) => [asc(districts.name)],
    });

  if (!districtsList || districtsList.length === 0) {
    return [];
  }

  return districtsList;
}

/**
 * Mengambil semua desa/kelurahan (villages) yang berada di bawah ID kecamatan tertentu.
 * @param districtId UUID dari Kecamatan.
 * @returns Array of villages.
 */
export async function getVillagesByDistrict(districtId: UUID) {
  const villagesList = await db.query.villages
    .findMany({
      columns: {
        id: true,
        name: true,
      },
      where: (villages, { eq }) => eq(villages.districtId, districtId),
      orderBy: (villages, { asc }) => [asc(villages.name)],
    });

  if (!villagesList || villagesList.length === 0) {
    return [];
  }

  return villagesList;
}