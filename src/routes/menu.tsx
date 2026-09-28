import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero-bowl.jpg";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — CHOPSTACK" },
      { name: "description", content: "The CHOPSTACK menu: stir-fried noodles, fried plantain and grilled protein. Build your stack." },
      { property: "og:title", content: "Menu — CHOPSTACK" },
      { property: "og:description", content: "Stir-fried noodles, fried plantain and grilled protein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

const sections = [
  { title: "Stacks", items: [
    { name: "The Classic Stack", desc: "Stir-fried noodles, dodo, grilled chicken.", price: "₦6,500" },
    { name: "Beef Stack", desc: "Stir-fried noodles, dodo, peppered beef.", price: "₦7,000" },
    { name: "Double Up", desc: "Noodles, double dodo, chicken and beef.", price: "₦9,500" },
  ]},
  { title: "On the side", items: [
    { name: "Extra Dodo", desc: "Ripe plantain, fried golden.", price: "₦1,500" },
    { name: "Extra Protein", desc: "Chicken or beef.", price: "₦2,500" },
    { name: "Pepper Sauce", desc: "House-made. Hot.", price: "₦500" },
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
