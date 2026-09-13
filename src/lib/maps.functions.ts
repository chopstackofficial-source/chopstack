import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) throw new Error("Maps service is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  };
}

type GeocodeResponse = {
  results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
};

async function geocodeRequest(query: string): Promise<GeocodeResponse> {
  const res = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?${query}`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Maps geocode failed [${res.status}]: ${body}`);
    throw new Error(`Location lookup failed [${res.status}]`);
  }
  return (await res.json()) as GeocodeResponse;
}

/** Address -> coordinates */
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => ({ query: String(d.query ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    if (!data.query.trim()) return { lat: null, lng: null, address: "" };
    const json = await geocodeRequest(
      `address=${encodeURIComponent(data.query)}&region=ng&components=country:NG`,
    );
    const first = json.results?.[0];
    if (!first) return { lat: null, lng: null, address: "" };
    return {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      address: first.formatted_address,
    };
  });

/** Coordinates -> address */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((d: { lat: number; lng: number }) => ({ lat: Number(d.lat), lng: Number(d.lng) }))
  .handler(async ({ data }) => {
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return { address: "" };
    const json = await geocodeRequest(`latlng=${data.lat},${data.lng}`);
    return { address: json.results?.[0]?.formatted_address ?? "" };
  });
