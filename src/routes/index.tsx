import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import hero from "@/assets/hero-bowl.jpg";
import noodles from "@/assets/noodles.jpg";
import plantain from "@/assets/plantain.jpg";
import protein from "@/assets/protein.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHOPSTACK — Noodles · Plantain · Protein" },
      { name: "description", content: "CHOPSTACK is a modern Nigerian food brand. Stir-fried noodles, fried plantain and protein, done properly." },
      { property: "og:title", content: "CHOPSTACK — Noodles · Plantain · Protein" },
      { property: "og:description", content: "A modern Nigerian food brand. Stir-fried noodles, fried plantain and protein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const trio = [
  { n: "01", name: "Noodles", img: noodles, copy: "Wok-tossed hot. Peppers, onions, heat." },
  { n: "02", name: "Plantain", img: plantain, copy: "Ripe, sweet, caramelised at the edges." },
  { n: "03", name: "Protein", img: protein, copy: "Chicken or beef. Spiced, grilled, stacked." },
];

function Home() {
  return (
    <>
      <section className="relative min-h-[100svh] flex items-end overflow-hidden grain">
        <img src={hero} alt="CHOPSTACK noodles, plantain and chicken bowl" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover scale-105 animate-slow-zoom" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8 pb-14 md:pb-20">
          <div className="text-xs md:text-sm uppercase tracking-[0.35em] text-primary mb-4 rise">Lagos · Est. 2026</div>
          <h1 className="font-display uppercase leading-[0.85] text-[22vw] md:text-[13rem] rise [animation-delay:120ms]">Chop<br/>stack</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 rise [animation-delay:240ms]">
            <p className="text-lg md:text-2xl font-medium">Noodles <span className="text-primary">·</span> Plantain <span className="text-primary">·</span> Protein</p>
            <Link to="/menu" className="group inline-flex items-center gap-3 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold uppercase tracking-wider text-sm">
              See the menu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-24 md:py-36">
        <p className="font-display uppercase text-5xl md:text-8xl leading-[0.9] max-w-5xl">
          Three things. <span className="text-primary">Done right.</span> Every single time.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 grid gap-5 md:grid-cols-3">
        {trio.map((t) => (
          <article key={t.name} className="group relative overflow-hidden rounded-3xl bg-card aspect-[3/4]">
            <img src={t.img} alt={t.name} loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <div className="text-primary text-sm font-semibold tracking-[0.3em]">{t.n}</div>
              <h3 className="font-display uppercase text-6xl mt-1">{t.name}</h3>
              <p className="text-muted-foreground mt-2 max-w-[22ch]">{t.copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden border-y border-border my-24 md:my-36 py-6">
        <div className="marquee font-display uppercase text-6xl md:text-8xl whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="inline-flex gap-10 pr-10">
              <span>Noodles</span><span className="text-primary">✦</span><span>Plantain</span><span className="text-primary">✦</span><span>Protein</span><span className="text-primary">✦</span>
              <span className="text-outline">Chopstack</span><span className="text-primary">✦</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-primary mb-5">The story</div>
          <h2 className="font-display uppercase text-5xl md:text-7xl leading-[0.9]">Born in Nigeria. Built for everywhere.</h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">Street-food energy, kitchen discipline. We started with the plate we crave most and refused to overcomplicate it.</p>
          <Link to="/story" className="mt-8 inline-flex items-center gap-2 font-semibold uppercase tracking-wider text-sm border-b-2 border-primary pb-1 hover:gap-4 transition-all">Read more <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-3xl overflow-hidden aspect-square">
          <img src={noodles} alt="Noodles lifted with chopsticks" loading="lazy" width={1024} height={1024} className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 mt-24 md:mt-36">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <h2 className="font-display uppercase text-6xl md:text-8xl leading-[0.85]">Come<br/>hungry.</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/visit" className="rounded-full bg-background text-foreground px-6 py-3 font-semibold uppercase tracking-wider text-sm">Find us</Link>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="rounded-full border-2 border-primary-foreground px-6 py-3 font-semibold uppercase tracking-wider text-sm">Follow</a>
          </div>
        </div>
      </section>
    </>
  );
}
