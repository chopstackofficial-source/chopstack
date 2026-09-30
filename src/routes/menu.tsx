import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero-bowl.jpg";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — CHOPSTACK" },
      { name: "description", content: "The CHOPSTACK menu: noodles with plantain for ₦1,300, or Nigerian-style spaghetti with plantain for ₦1,600." },
      { property: "og:title", content: "Menu — CHOPSTACK" },
      { property: "og:description", content: "Noodles with plantain for ₦1,300, or Nigerian-style spaghetti with plantain for ₦1,600." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

const sections = [
  { title: "The Stack", items: [
    { name: "Noodles + Plantain", desc: "Stir-fried noodles with fried plantain — add whichever protein you like.", price: "₦1,300" },
    { name: "Pasta + Plantain", desc: "Nigerian-style spaghetti with fried plantain — add whichever protein you like.", price: "₦1,600" },
  ]},
];

function MenuPage() {
  return (
    <div className="pt-28 md:pt-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-xs uppercase tracking-[0.35em] text-primary mb-4">Menu</div>
        <h1 className="font-display uppercase text-7xl md:text-[10rem] leading-[0.85]">Build your<br/>stack.</h1>
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8 mt-14 rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
        <img src={hero} alt="CHOPSTACK bowl" width={1536} height={1024} className="h-full w-full object-cover" />
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8 mt-20 grid gap-16 md:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display uppercase text-4xl text-primary mb-6">{s.title}</h2>
            <ul className="divide-y divide-border border-y border-border">
              {s.items.map((i) => (
                <li key={i.name} className="py-6 flex justify-between gap-6 group">
                  <div>
                    <div className="text-xl md:text-2xl font-semibold group-hover:text-primary transition-colors">{i.name}</div>
                    <div className="text-muted-foreground mt-1">{i.desc}</div>
                  </div>
                  <div className="font-display text-2xl whitespace-nowrap">{i.price}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mx-auto max-w-7xl px-5 md:px-8 mt-10 text-sm text-muted-foreground">Prices are indicative and may change.</p>
    </div>
  );
}
