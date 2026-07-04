import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { readZoneId, writeZoneId } from "@/lib/zone";
import { addToCart } from "@/lib/cart";
import { aiSearchProducts } from "@/lib/ai-search.functions";
import { formatPrice } from "@/lib/format";
import { Search, MapPin, ChevronDown, Plus, Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Zone = { id: string; name: string; delivery_fee: number };
type Product = { id: string; name: string; photo_url: string | null; price: number; quantity: number; vendor: { name: string } | null };

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [ai, setAi] = useState<{ query: string; loading: boolean; message: string; matches: { productId: string; reason: string }[] } | null>(null);
  const [aiInput, setAiInput] = useState("");

  useEffect(() => {
    supabase.from("zones").select("id,name,delivery_fee").eq("active", true).order("name").then(({ data }) => {
      const zs = (data ?? []) as Zone[];
      setZones(zs);
      const saved = readZoneId();
      if (saved && zs.find((z) => z.id === saved)) setZoneId(saved);
      else if (zs[0]) { setZoneId(zs[0].id); writeZoneId(zs[0].id); }
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    setLoading(true);
    (async () => {
      const { data: pz } = await supabase.from("product_zones").select("product_id").eq("zone_id", zoneId);
      const ids = (pz ?? []).map((r) => r.product_id);
      if (ids.length === 0) { setProducts([]); setLoading(false); return; }
      let query = supabase.from("products").select("id,name,photo_url,price,quantity,vendor:vendors(name)").in("id", ids).eq("is_sold_out", false).gt("quantity", 0).order("created_at", { ascending: false });
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      setProducts((data ?? []) as unknown as Product[]);
      setLoading(false);
    })();
  }, [zoneId, q]);

  const currentZone = zones.find((z) => z.id === zoneId);

  const handleAdd = (p: Product) => {
    addToCart(p.id, 1);
    setAdded((s) => ({ ...s, [p.id]: true }));
    toast.success(`${p.name} added to cart`);
    setTimeout(() => setAdded((s) => ({ ...s, [p.id]: false })), 1200);
  };

  const RATE_KEY = "cs_ai_search_count_v1";
  const askAi = async () => {
    const q = aiInput.trim();
    if (!q || !zoneId) return;
    const used = Number(localStorage.getItem(RATE_KEY) ?? "0");
    if (used >= 10) { toast.error("You've hit the search limit for this session."); return; }
    setAi({ query: q, loading: true, message: "", matches: [] });
    try {
      const res = await aiSearchProducts({ data: { zoneId, query: q.slice(0, 100) } });
      localStorage.setItem(RATE_KEY, String(used + 1));
      setAi({ query: q, loading: false, message: res.message, matches: res.matches });
    } catch (e) {
      setAi({ query: q, loading: false, message: (e as Error).message, matches: [] });
    }
  };

  const aiProducts = ai ? products.filter((p) => ai.matches.some((m) => m.productId === p.id)) : [];

  return (
    <MobileShell>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <img src={logo} alt="" className="w-8 h-8" />
          <button onClick={() => setShowPicker((s) => !s)} className="flex-1 flex items-center gap-1 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold truncate">{currentZone?.name ?? "Pick zone"}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {showPicker && (
          <div className="px-4 pb-3">
            <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
              {zones.map((z) => (
                <button key={z.id} onClick={() => { setZoneId(z.id); writeZoneId(z.id); setShowPicker(false); }} className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent">
                  <span>{z.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPrice(z.delivery_fee)} delivery</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-4 pb-3 space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); askAi(); }} className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input value={aiInput} maxLength={100} onChange={(e) => setAiInput(e.target.value)} placeholder="What do you need? Ask anything…" className="w-full h-11 pl-10 pr-20 rounded-full bg-primary/10 border border-primary/30 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={!aiInput.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">Ask</button>
          </form>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or search by name" className="w-full h-10 pl-10 pr-3 rounded-full bg-muted/60 border border-border text-sm outline-none focus:border-primary" />
          </div>
        </div>
      </header>

      <main className="px-3 py-3">
        {ai && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">You asked</div>
                <div className="text-sm font-medium">"{ai.query}"</div>
              </div>
              <button onClick={() => { setAi(null); setAiInput(""); }} className="text-xs text-muted-foreground">Clear</button>
            </div>
            {ai.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>
            ) : (
              <>
                <p className="text-sm mb-2">{ai.message}</p>
                {aiProducts.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {aiProducts.map((p) => (
                      <div key={p.id} className="bg-card rounded-xl border border-border overflow-hidden">
                        <Link to="/product/$id" params={{ id: p.id }} className="block aspect-square bg-muted overflow-hidden">
                          {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />}
                        </Link>
                        <div className="p-2">
                          <div className="text-xs font-semibold line-clamp-1">{p.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-black text-primary">{formatPrice(Number(p.price))}</span>
                            <button onClick={() => handleAdd(p)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
                              {added[p.id] ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {q ? "Nothing matched your search." : "No stock in this zone yet. Check back soon."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
                <Link to="/product/$id" params={{ id: p.id }} className="block aspect-square bg-muted overflow-hidden">
                  {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">No photo</div>}
                </Link>
                <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                  <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{p.vendor?.name}</div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <div className="text-base font-black text-primary">{formatPrice(Number(p.price))}</div>
                    <button onClick={() => handleAdd(p)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
                      {added[p.id] ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}
