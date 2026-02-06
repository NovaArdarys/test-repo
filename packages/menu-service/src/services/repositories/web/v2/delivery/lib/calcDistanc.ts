export default function calcDistance(
  lat1?: string | null,
  lon1?: string | null,
  lat2?: string | null,
  lon2?: string | null
): number {

  // jika tidak ada koordinat → fallback besar
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) {
    return 999999;
  }

  const lat1n = parseFloat(lat1);
  const lon1n = parseFloat(lon1);
  const lat2n = parseFloat(lat2);
  const lon2n = parseFloat(lon2);

  if (
    isNaN(lat1n) ||
    isNaN(lon1n) ||
    isNaN(lat2n) ||
    isNaN(lon2n)
  ) {
    return 999999;
  }

  const R = 6371; // radius bumi km
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2n - lat1n);
  const dLon = toRad(lon2n - lon1n);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1n)) *
    Math.cos(toRad(lat2n)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Number(distance.toFixed(2)); // km
}
