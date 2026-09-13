let promise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: typeof google.maps } };
    if (w.google?.maps) {
      resolve(w.google.maps);
      return;
    }
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
    if (!key) {
      reject(new Error("Google Maps key missing"));
      return;
    }
    const cbName = "__chopstackInitMap";
    (window as unknown as Record<string, unknown>)[cbName] = () => {
      const g = (window as unknown as { google: { maps: typeof google.maps } }).google;
      resolve(g.maps);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${cbName}${channel ? `&channel=${channel}` : ""}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return promise;
}
