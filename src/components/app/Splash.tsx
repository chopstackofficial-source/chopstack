import { useEffect, useState } from "react";
import splash from "@/assets/splash.png";

export function Splash({ onDone, duration = 1600 }: { onDone?: () => void; duration?: number }) {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), duration - 300);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <img src={splash} alt="CHOPSTACK" className="w-56 max-w-[70vw] animate-pulse" />
    </div>
  );
}