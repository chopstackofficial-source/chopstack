import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RATES: Record<string, number> = {
  bike: 350,
  keke: 450,
  taxi: 650,
  minivan: 800,
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/**
 * Quote a delivery fee for a route. Uses Google Maps Routes API
 * (computeRouteMatrix) via the Lovable connector gateway. Falls back to a
 * haversine estimate if Google is unavailable.
 */
export const quoteDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        pickup: z.object({ lat: z.number(), lng: z.number() }),
        dropoff: z.object({ lat: z.number(), lng: z.number() }),
        vehicleType: z.enum(["bike", "keke", "taxi", "minivan"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const rate = RATES[data.vehicleType];
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;

    let km: number | null = null;

    if (lovableKey && gmKey) {
      try {
        const res = await fetch(
          `${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": gmKey,
              "Content-Type": "application/json",
              "X-Goog-FieldMask":
                "originIndex,destinationIndex,distanceMeters,duration,status",
            },
            body: JSON.stringify({
              origins: [
                {
                  waypoint: {
                    location: {
                      latLng: { latitude: data.pickup.lat, longitude: data.pickup.lng },
                    },
                  },
                },
              ],
              destinations: [
                {
                  waypoint: {
                    location: {
                      latLng: { latitude: data.dropoff.lat, longitude: data.dropoff.lng },
                    },
                  },
                },
              ],
              travelMode: "DRIVE",
            }),
          },
        );
        if (res.ok) {
          const body = (await res.json()) as Array<{ distanceMeters?: number }>;
          const first = Array.isArray(body) ? body[0] : null;
          if (first?.distanceMeters) km = first.distanceMeters / 1000;
        }
      } catch (e) {
        console.error("[quoteDeliveryFee] gateway failed", e);
      }
    }

    if (km == null) {
      // Haversine fallback
      const R = 6371;
      const dLat = ((data.dropoff.lat - data.pickup.lat) * Math.PI) / 180;
      const dLng = ((data.dropoff.lng - data.pickup.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((data.pickup.lat * Math.PI) / 180) *
          Math.cos((data.dropoff.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const fee = Math.round(km * rate);
    return { km: Math.round(km * 10) / 10, fee, vehicleType: data.vehicleType };
  });