import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { readLocation, writeLocation, type SavedLocation } from "@/lib/location";
import { addToCart } from "@/lib/cart";
import { aiSearchProducts } from "@/lib/ai-search.functions";
import { formatPrice } from "@/lib/format";
import { haversineKm, maxRadiusKm, type Tier } from "@/lib/distance";
import { LocationPicker } from "@/components/app/LocationPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { MapPin, ChevronDown, Plus, Check, Sparkles, Loader2, Leaf } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Product = {
  id: string;
  name: string;
  photo_url: string | null;
  price: number;
  quantity: number;
  is_farm_product: boolean;
  vendor: { name: string; latitude: number | null; longitude: number | null } | null;
};

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, buyer, refresh } = useAuth();
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [ai, setAi] = useState<{ query: string; loading: boolean; message: string; matches: { productId: string; reason: string }[] } | null>(null);
  const [aiInput, setAiInput] = useState("");

  useEffect(() => {
    supabase.from("delivery_tiers").select("id,min_km,max_km,delivery_fee").order("sort_order").then(({ data }) => {
      setTiers(((data ?? []) as unknown as Tier[]).map((t) => ({ ...t, min_km: Number(t.min_km), max_km: Number(t.max_km), delivery_fee: Number(t.delivery_fee) })));
    });
  }, []);

  useEffect(() => {
    const saved = readLocation();
    if (saved) { setLocation(saved); return; }
    if (buyer?.latitude != null && buyer?.longitude != null) {
      const l = { lat: buyer.latitude, lng: buyer.longitude, address: buyer.delivery_address ?? "" };
      writeLocation(l);
      setLocation(l);
      return;
    }
    if (buyer && user) setShowPicker(true);
  }, [buyer, user]);

  const maxKm = useMemo(() => maxRadiusKm(tiers), [tiers]);

  useEffect(() => {
    if (!location) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,photo_url,price,quantity,is_farm_product,vendor:vendors(name,latitude,longitude,status)")
        .eq("is_sold_out", false)
        .gt("quantity", 0)
        .order("created_at", { ascending: false });
      type Row = Product & { vendor: (Product["vendor"] & { status: string }) | null };
      const rows = ((data ?? []) as unknown as Row[]).filter((p) => {
        if (p.is_farm_product) return true;
        const v = p.vendor;
        if (!v || v.status !== "active") return false;
        if (v.latitude == null || v.longitude == null) return false;
        if (maxKm === 0) return false;
        const km = haversineKm({ lat: location.lat, lng: location.lng }, { lat: v.latitude, lng: v.longitude });
        return km <= maxKm;
      });
      setProducts(rows);
      setLoading(false);
    })();
  }, [location, maxKm]);

  const handleAdd = (p: Product) => {
    addToCart(p.id, 1);
    setAdded((s) => ({ ...s, [p.id]: true }));
    toast.success(`${p.name} added to cart`);
    setTimeout(() => setAdded((s) => ({ ...s, [p.id]: false })), 1200);
  };

  const saveLocation = async (loc: SavedLocation) => {
    writeLocation(loc);
    setLocation(loc);
    setShowPicker(false);
    if (user) {
      await supabase.from("buyers").update({ latitude: loc.lat, longitude: loc.lng, delivery_address: loc.address }).eq("id", user.id);
      refresh();
    }
    toast.success("Delivery location updated");
  };

  const RATE_KEY = "cs_ai_search_count_v1";
  const askAi = async () => {
    const q = aiInput.trim();
    if (!q || !location) return;
    const used = Number(localStorage.getItem(RATE_KEY) ?? "0");
    if (used >= 10) { toast.error("You've hit the search limit for this session."); return; }
    setAi({ query: q, loading: true, message: "", matches: [] });
    try {
      const res = await aiSearchProducts({ data: { lat: location.lat, lng: location.lng, query: q.slice(0, 100) } });
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
          <button onClick={() => setShowPicker(true)} className="flex-1 flex items-center gap-1 text-sm min-w-0 text-left">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold truncate">{location?.address || "Set delivery location"}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
          <ThemeToggle className="h-8 w-8" />
        </div>
      </header>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery location</DialogTitle>
          </DialogHeader>
          <LocationPicker initial={location ? { lat: location.lat, lng: location.lng } : null} onConfirm={saveLocation} />
        </DialogContent>
      </Dialog>

      <main className="px-3 py-3">
        <section className="mb-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-4 shadow-[var(--glow-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black tracking-tight">What do you need today?</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Ask in your own words — we'll find it from stock in your zone.</p>
          <form onSubmit={(e) => { e.preventDefault(); askAi(); }} className="relative">
            <input
              value={aiInput}
              maxLength={100}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="e.g. ingredients for jollof rice"
              className="w-full h-14 pl-4 pr-24 rounded-2xl bg-background border-2 border-primary/40 text-sm font-medium outline-none focus:border-primary shadow-sm"
            />
            <button
              type="submit"
              disabled={!aiInput.trim() || ai?.loading || !location}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
            >
              {ai?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ask
            </button>
          </form>
        </section>
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
        ) : !location ? (
          <div className="text-center py-16 text-muted-foreground text-sm space-y-3">
            <p>Set your delivery location to see what's near you.</p>
            <button onClick={() => setShowPicker(true)} className="text-primary font-medium">Set location</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No vendors within {maxKm}km yet. Check back soon.
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
                  <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    {p.is_farm_product ? (
                      <span className="inline-flex items-center gap-0.5 text-primary font-semibold"><Leaf className="w-3 h-3" />From the Farm</span>
                    ) : (
                      p.vendor?.name
                    )}
                  </div>
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
