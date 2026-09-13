import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { geocodeAddress, reverseGeocode } from "@/lib/maps.functions";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";

type Props = {
  initial?: { lat: number; lng: number } | null;
  onConfirm: (loc: { lat: number; lng: number; address: string }) => void;
  confirmLabel?: string;
};

// Lagos as safe default
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

export function LocationPicker({ initial, onConfirm, confirmLabel = "Confirm location" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial ?? null);
  const [address, setAddress] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [busy, setBusy] = useState(false);

  const lookupAddress = async (lat: number, lng: number) => {
    try {
      const r = await reverseGeocode({ data: { lat, lng } });
      setAddress(r.address);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const start = initial ?? DEFAULT_CENTER;
        const map = new maps.Map(containerRef.current, {
          center: start,
          zoom: initial ? 16 : 11,
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        mapRef.current = map;
        const marker = new maps.Marker({ position: start, map, draggable: true });
        markerRef.current = marker;
        setReady(true);

        const set = (lat: number, lng: number) => {
          setCoords({ lat, lng });
          void lookupAddress(lat, lng);
        };

        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) set(p.lat(), p.lng());
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          set(e.latLng.lat(), e.latLng.lng());
        });

        if (initial) {
          set(initial.lat, initial.lng);
        } else if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.panTo({ lat: latitude, lng: longitude });
              map.setZoom(16);
              marker.setPosition({ lat: latitude, lng: longitude });
              set(latitude, longitude);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 },
          );
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initial]);

  const search = async () => {
    const q = searchInput.trim();
    if (!q || !mapRef.current || !markerRef.current) return;
    setBusy(true);
    try {
      const r = await geocodeAddress({ data: { query: q } });
      if (r.lat == null || r.lng == null) return;
      const pos = { lat: r.lat, lng: r.lng };
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(16);
      markerRef.current.setPosition(pos);
      setCoords(pos);
      setAddress(r.address);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const useGps = () => {
    if (!navigator.geolocation || !mapRef.current || !markerRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current!.panTo(p);
        mapRef.current!.setZoom(16);
        markerRef.current!.setPosition(p);
        setCoords(p);
        void lookupAddress(p.lat, p.lng);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (failed) {
    return <div className="p-4 text-sm text-destructive border border-destructive/40 rounded-xl">Map unavailable. Try again shortly.</div>;
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); void search(); }} className="relative">
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
      <div className="relative h-72 rounded-2xl overflow-hidden border border-border">
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-muted/40">
            <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
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
