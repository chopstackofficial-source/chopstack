import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requireAuthOrRedirect } from "@/lib/auth-guard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package2, MapPin, Users, Store } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { LocationFilter, type LocationValue } from "@/components/app/LocationFilter";

export const Route = createFileRoute("/browse")({ component: Browse });

const CATEGORIES = ["All", "Vegetables", "Fruits", "Grains", "Tubers", "Poultry", "Dairy"];

function Browse() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<LocationValue>({});
  const [todayOnly, setTodayOnly] = useState(false);
  const [town, setTown] = useState("");
  const [bundles, setBundles] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [groupBuys, setGroupBuys] = useState<any[]>([]);

  // If already logged in, send them to their real home
  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      navigate({ to: profile.account_type === "farmer" ? "/dashboard" : "/home" });
    }
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    supabase
      .from("bundles")
      .select("*")
      .eq("status", "active")
      .limit(10)
      .then(({ data }) => setBundles(data ?? []));
  }, []);

  useEffect(() => {
    supabase
      .from("splits")
      .select("*, listings(id, title, images, price, unit, quantity_available)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setGroupBuys(data ?? []));
  }, []);

  useEffect(() => {
    let query = supabase
      .from("listings")
      .select("*, users!listings_farmer_id_fkey(lga, state)")
      .eq("status", "active");
    if (cat !== "All") query = query.eq("category", cat);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    if (todayOnly) query = query.eq("available_today", true);
    if (town.trim()) query = query.ilike("town", `%${town.trim()}%`);
    query
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setListings(data ?? []));
  }, [cat, q, todayOnly, town]);

  const guardedSell = () =>
    requireAuthOrRedirect(user, navigate, { redirectTo: "/create-listing" });

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CHOPSTACK" className="w-8 h-8 object-contain" />
          <span className="font-black tracking-tight">
            <span className="text-foreground">CHOP</span>
            <span className="text-primary">STACK</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm text-muted-foreground">Log in</Link>
          <Link to="/signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Fresh food. Direct from source.</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse listings, bundles and group buys. Sign up free when you're ready to order or sell.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search produce, bundles..."
            className="pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <LocationFilter value={loc} onChange={setLoc} />
          <button
            onClick={() => setTodayOnly((v) => !v)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition",
              todayOnly
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--glow-primary)]"
                : "bg-card text-foreground border-border",
            )}
          >
            Available today
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition",
                cat === c
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--glow-primary)]"
                  : "bg-card text-foreground border-border",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-sm">Have food to sell?</p>
              <p className="text-xs text-muted-foreground">List it free and reach buyers near you.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={guardedSell}>Start selling</Button>
        </div>

        {groupBuys.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Active group buys
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              {groupBuys.map((s) => {
                const l = s.listings;
                if (!l) return null;
                return (
                  <Link
                    key={s.id}
                    to="/listings/$id"
                    params={{ id: l.id }}
                    className="min-w-[220px] bg-card rounded-xl overflow-hidden border border-border"
                  >
                    {l.images?.[0] ? (
                      <img src={l.images[0]} alt={l.title} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-secondary" />
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm truncate">{l.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.filled_slots}/{s.total_slots} slots filled</p>
                      <p className="text-primary font-bold text-sm mt-1">
                        {formatPrice((Number(l.price) * l.quantity_available) / s.total_slots)}
                        <span className="text-muted-foreground text-xs font-normal"> /slot</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package2 className="w-5 h-5 text-primary" /> Kitchen Bundles
            </h2>
            <Link to="/bundles" className="text-xs text-primary">See all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            {bundles.length === 0 && <p className="text-sm text-muted-foreground">No bundles yet.</p>}
            {bundles.map((b) => (
              <Link
                key={b.id}
                to="/bundles/$id"
                params={{ id: b.id }}
                className="min-w-[200px] bg-card rounded-xl overflow-hidden border border-border"
              >
                {b.cover_image ? (
                  <img src={b.cover_image} alt={b.title} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-secondary flex items-center justify-center">
                    <Package2 className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{b.title}</h3>
                  <p className="text-primary font-bold mt-1">{formatPrice(Number(b.price))}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">All listings</h2>
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const lLga = loc.lga?.trim().toLowerCase();
              const lState = loc.state?.trim().toLowerCase();
              const filtered = listings.filter((l) => {
                if (!lLga && !lState) return true;
                const u = (l as any).users;
                const lg = (u?.lga ?? "").toLowerCase();
                const st = (u?.state ?? "").toLowerCase();
                if (lLga && !lg.includes(lLga)) return false;
                if (lState && !st.includes(lState)) return false;
                return true;
              });
              if (filtered.length === 0) return (
                <p className="text-sm text-muted-foreground col-span-2">No listings match your search.</p>
              );
              return filtered.map((l) => (
                <Link
                  key={l.id}
                  to="/listings/$id"
                  params={{ id: l.id }}
                  className="bg-card rounded-xl overflow-hidden border border-border"
                >
                  {l.images?.[0] ? (
                    <img src={l.images[0]} alt={l.title} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-secondary" />
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate">{l.title}</h3>
                    <p className="text-primary font-bold text-sm mt-1">
                      {formatPrice(Number(l.price))}
                      <span className="text-muted-foreground text-xs font-normal">/{l.unit}</span>
                    </p>
                    {((l as any).users?.lga || (l as any).users?.state || l.pickup_location) && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[(l as any).users?.lga, (l as any).users?.state].filter(Boolean).join(", ") || l.pickup_location}
                      </p>
                    )}
                  </div>
                </Link>
              ));
            })()}
            {false && (
              <p className="text-sm text-muted-foreground col-span-2">No listings match your search.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}