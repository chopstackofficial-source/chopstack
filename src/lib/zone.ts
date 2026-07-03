const KEY = "cs_zone_id_v1";
export function readZoneId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}
export function writeZoneId(id: string) { localStorage.setItem(KEY, id); }
