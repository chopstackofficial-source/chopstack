import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import splash from "@/assets/splash.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [minDone, setMinDone] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Safety: never let the splash hang on a slow/missing image
  useEffect(() => {
    const t = setTimeout(() => setImgLoaded(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRouteReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !minDone || !imgLoaded) return;
    if (typeof window !== "undefined") sessionStorage.setItem("cs_splash_shown", "1");
    if (!user) {
      navigate({ to: "/browse" });
    } else if (profile?.account_type || routeReady) {
      navigate({ to: "/home" });
    }
  }, [user, profile, loading, minDone, imgLoaded, routeReady, navigate]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <img
        src={splash}
        alt="CHOPSTACK"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
        className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-700 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
