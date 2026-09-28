import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/visit")({
  head: () => ({
    meta: [
      { title: "Visit — CHOPSTACK" },
      { name: "description", content: "Find CHOPSTACK in Lagos. Opening hours, location and how to reach us." },
      { property: "og:title", content: "Visit — CHOPSTACK" },
      { property: "og:description", content: "Find CHOPSTACK in Lagos: hours, location and contact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VisitPage,
});

function VisitPage() {
  return (
    <div className="pt-28 md:pt-36 mx-auto max-w-7xl px-5 md:px-8">
      <div className="text-xs uppercase tracking-[0.35em] text-primary mb-4">Visit</div>
      <h1 className="font-display uppercase text-7xl md:text-[10rem] leading-[0.85]">Pull up.</h1>
      <div className="mt-16 grid md:grid-cols-3 gap-10">
        <div className="border-t border-border pt-6">
          <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Location</h2>
          <p className="font-display text-3xl uppercase mt-3">Lekki, Lagos</p>
          <p className="text-muted-foreground mt-1">Full address coming soon</p>
        </div>
        <div className="border-t border-border pt-6">
          <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Hours</h2>
          <p className="font-display text-3xl uppercase mt-3">Mon–Sun</p>
          <p className="text-muted-foreground mt-1">11:00 – 22:00</p>
        </div>
        <div className="border-t border-border pt-6">
          <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Say hi</h2>
          <a href="mailto:chopstackofficial@gmail.com" className="font-display text-2xl md:text-3xl uppercase mt-3 block hover:text-primary break-all">chopstackofficial@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
