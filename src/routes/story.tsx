import { createFileRoute } from "@tanstack/react-router";
import plantain from "@/assets/plantain.jpg";
import protein from "@/assets/protein.jpg";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "Our Story — CHOPSTACK" },
      { name: "description", content: "How CHOPSTACK started: a modern Nigerian food brand focused on noodles, pasta, plantain and protein." },
      { property: "og:title", content: "Our Story — CHOPSTACK" },
      { property: "og:description", content: "A modern Nigerian food brand, built on one plate done right." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoryPage,
});

const values = [
  { t: "Focus", d: "A short menu means every plate gets our full attention." },
  { t: "Fresh", d: "Cooked to order. Hot from the wok to you." },
  { t: "Proudly Naija", d: "Flavours we grew up on, served with global standards." },
];

function StoryPage() {
  return (
    <div className="pt-28 md:pt-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-xs uppercase tracking-[0.35em] text-primary mb-4">Story</div>
        <h1 className="font-display uppercase text-4xl md:text-8xl leading-[0.9] max-w-5xl">One plate. No shortcuts.</h1>
        <p className="mt-10 text-xl md:text-2xl text-muted-foreground max-w-2xl">CHOPSTACK started with a simple idea: take the combination everybody loves — noodles or pasta, dodo and something grilled — and make it the best version you've ever had.</p>
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8 mt-16 grid md:grid-cols-2 gap-5">
        <img src={plantain} alt="Fried plantain" loading="lazy" width={1024} height={1024} className="rounded-3xl aspect-square object-cover w-full" />
        <img src={protein} alt="Grilled protein" loading="lazy" width={1024} height={1024} className="rounded-3xl aspect-square object-cover w-full md:mt-20" />
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8 mt-24 grid md:grid-cols-3 gap-10">
        {values.map((v, i) => (
          <div key={v.t} className="border-t-2 border-primary pt-6">
            <div className="text-sm text-primary tracking-[0.3em]">0{i + 1}</div>
            <h3 className="font-display uppercase text-4xl mt-2">{v.t}</h3>
            <p className="text-muted-foreground mt-3">{v.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
