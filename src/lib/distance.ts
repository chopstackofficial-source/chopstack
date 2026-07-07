export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Tier = { id: string; min_km: number; max_km: number; delivery_fee: number };

export function findTier(tiers: Tier[], km: number): Tier | null {
  const sorted = [...tiers].sort((a, b) => Number(a.min_km) - Number(b.min_km));
  return sorted.find((t) => km >= Number(t.min_km) && km <= Number(t.max_km)) ?? null;
}

export function maxRadiusKm(tiers: Tier[]): number {
  return tiers.reduce((m, t) => Math.max(m, Number(t.max_km)), 0);
}