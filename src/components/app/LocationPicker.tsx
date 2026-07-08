import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { getMapboxToken } from "@/lib/mapbox.functions";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";

type Props = {
  initial?: { lat: number; lng: number } | null;
  onConfirm: (loc: { lat: number; lng: number; address: string }) => void;
  confirmLabel?: string;
};

// Port Harcourt as safe default (lng, lat)
const DEFAULT_CENTER: [number, number] = [7.0498, 4.8156];

export function LocationPicker({ initial, onConfirm, confirmLabel = "Confirm location" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial ?? null);
  const [address, setAddress] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const envToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) || "";
    if (envToken) { setToken(envToken); return; }
    getMapboxToken()
      .then((r) => setToken(r.token || ""))
      .catch(() => setToken(""));
  }, []);

  const reverseGeocode = async (lat: number, lng: number, t: string) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${t}&limit=1`,
      );
      const json = (await res.json()) as { features?: { place_name: string }[] };
      setAddress(json.features?.[0]?.place_name ?? "");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const start: [number, number] = initial ? [initial.lng, initial.lat] : DEFAULT_CENTER;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: start,
      zoom: initial ? 15 : 11,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    const marker = new mapboxgl.Marker({ draggable: true, color: "hsl(24 95% 53%)" })
      .setLngLat(start)
      .addTo(map);
    markerRef.current = marker;
    const setFromLngLat = (lat: number, lng: number) => {
      setCoords({ lat, lng });
      reverseGeocode(lat, lng, token);
    };
    marker.on("dragend", () => {
      const l = marker.getLngLat();
      setFromLngLat(l.lat, l.lng);
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      setFromLngLat(e.lngLat.lat, e.lngLat.lng);
    });

    if (initial) {
      setFromLngLat(initial.lat, initial.lng);
    } else {
      // Default to Port Harcourt so the map is always usable; try GPS silently.
      setFromLngLat(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
      const tryGps = () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.flyTo({ center: [longitude, latitude], zoom: 15 });
            marker.setLngLat([longitude, latitude]);
            setFromLngLat(latitude, longitude);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        );
      };
      if (typeof navigator !== "undefined" && "permissions" in navigator) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((s) => { if (s.state !== "denied") tryGps(); })
          .catch(() => tryGps());
      } else {
        tryGps();
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token, initial]);

  const search = async () => {
    const q = searchInput.trim();
    if (!q || !token || !mapRef.current || !markerRef.current) return;
    setBusy(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=1&country=ng`,
      );
      const json = (await res.json()) as { features?: { center: [number, number]; place_name: string }[] };
      const feat = json.features?.[0];
      if (!feat) return;
      const [lng, lat] = feat.center;
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
      markerRef.current.setLngLat([lng, lat]);
      setCoords({ lat, lng });
      setAddress(feat.place_name);
    } finally {
      setBusy(false);
    }
  };

  const useGps = () => {
    if (!navigator.geolocation || !mapRef.current || !markerRef.current || !token) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current!.flyTo({ center: [longitude, latitude], zoom: 15 });
        markerRef.current!.setLngLat([longitude, latitude]);
        setCoords({ lat: latitude, lng: longitude });
        reverseGeocode(latitude, longitude, token);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (token === "") {
    return <div className="p-4 text-sm text-destructive border border-destructive/40 rounded-xl">Map unavailable. Try again shortly.</div>;
  }
  if (token === null) {
    return (
      <div className="h-64 grid place-items-center rounded-2xl border border-border bg-muted/40">
        <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search address or landmark"
          className="w-full h-10 pl-10 pr-24 rounded-full bg-muted/60 border border-border text-sm outline-none focus:border-primary"
        />
        <button type="button" onClick={useGps} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-full bg-background border border-border text-xs flex items-center gap-1">
          <LocateFixed className="w-3.5 h-3.5" /> GPS
        </button>
      </form>
      <div ref={containerRef} className="h-72 rounded-2xl overflow-hidden border border-border" />
      <div className="text-xs text-muted-foreground flex items-start gap-1">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
        <span className="line-clamp-2">{address || "Drag the pin to your exact spot."}</span>
      </div>
      <Button type="button" className="w-full" size="lg" disabled={!coords || busy} onClick={() => coords && onConfirm({ ...coords, address })}>
        {confirmLabel}
      </Button>
    </div>
  );
}