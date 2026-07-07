const KEY = "cs_location_v1";

export type SavedLocation = { lat: number; lng: number; address: string };

export function readLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedLocation;
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocation(l: SavedLocation) {
  localStorage.setItem(KEY, JSON.stringify(l));
}

export function clearLocation() {
  localStorage.removeItem(KEY);
}