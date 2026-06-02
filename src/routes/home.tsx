import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/app/BottomNav";
import { Input } from "@/components/ui/input";
import { Search, Package2, MapPin, Plus, Tag, Users, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocationFilter, type LocationValue } from "@/components/app/LocationFilter";

export const Route = createFileRoute("/home")({ component: Home });

const CATEGORIES = ["All", "Vegetables", "Fruits", "Grains", "Tubers", "Poultry", "Dairy"];

type FeedItem = {
  id: string;
  kind: "listing" | "bundle" | "split" | "order";
  created_at: string;
  category?: string | null;
  href?: { to: string; params: Record<string, string> };
  title: string;
  subtitle?: string | null;
  price?: number | null;
  unit?: string | null;
  image?: string | null;
  location?: string | null;
  meta?: string | null;
};

function timeAgo(s: string) {
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Home() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<LocationValue>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const isFarmer = profile?.account_type === "farmer";

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/browse" });
  }, [loading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [listingsRes, bundlesRes, splitsRes, ordersRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, price, unit, category, images, created_at, users!listings_farmer_id_fkey(full_name, lga, state, location)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("bundles")
          .select("id, title, price, category, cover_image, created_at, users!bundles_farmer_id_fkey(full_name, lga, state)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("splits")
          .select("id, total_slots, filled_slots, status, created_at, listing_id, listings!splits_listing_id_fkey(id, title, price, unit, category, images, users!listings_farmer_id_fkey(lga, state))")
          .in("status", ["open", "full"])
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select("id, status, created_at, listing_id, bundle_id, listings(title, category, users!listings_farmer_id_fkey(lga, state)), bundles(title, category), users!orders_buyer_id_fkey(lga, state)")
          .in("status", ["completed", "accepted"])
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;

      const items: FeedItem[] = [];

      for (const l of listingsRes.data ?? []) {
        items.push({
          id: `l-${l.id}`,
          kind: "listing",
          created_at: l.created_at ?? new Date().toISOString(),
          category: l.category,
          href: { to: "/listings/$id", params: { id: l.id } },
          title: l.title,
          subtitle: l.users?.full_name ?? null,
          price: Number(l.price),
          unit: l.unit,
          image: l.images?.[0] ?? null,
          location: [l.users?.lga, l.users?.state].filter(Boolean).join(", ") || l.users?.location || null,
          meta: "New listing",
        });
      }
      for (const b of bundlesRes.data ?? []) {
        items.push({
          id: `b-${b.id}`,
          kind: "bundle",
          created_at: b.created_at ?? new Date().toISOString(),
          category: b.category,
          href: { to: "/bundles/$id", params: { id: b.id } },
          title: b.title,
          subtitle: b.users?.full_name ?? null,
          price: Number(b.price),
          image: b.cover_image,
          location: [b.users?.lga, b.users?.state].filter(Boolean).join(", ") || null,
          meta: "New bundle",
        });
      }
      for (const s of splitsRes.data ?? []) {
        const l: any = s.listings;
        if (!l) continue;
        items.push({
          id: `s-${s.id}`,
          kind: "split",
          created_at: s.created_at ?? new Date().toISOString(),
          category: l.category,
          href: { to: "/listings/$id", params: { id: l.id } },
          title: l.title,
          subtitle: `Group buy · ${s.filled_slots}/${s.total_slots} joined`,
          price: Number(l.price),
          unit: l.unit,
          image: l.images?.[0] ?? null,
          location: [l.users?.lga, l.users?.state].filter(Boolean).join(", ") || null,
          meta: s.status === "full" ? "Group buy filled" : "Group buy filling up",
        });
      }
      for (const o of ordersRes.data ?? []) {
        const productTitle = (o as any).listings?.title ?? (o as any).bundles?.title;
        const category = (o as any).listings?.category ?? (o as any).bundles?.category;
        if (!productTitle) continue;
        const buyerLga = (o as any).users?.lga;
        const where = buyerLga ? `Someone in ${buyerLga}` : "Someone nearby";
        items.push({
          id: `o-${o.id}`,
          kind: "order",
          created_at: o.created_at ?? new Date().toISOString(),
          category,
          title: `${where} just ordered ${productTitle}`,
          meta: o.status === "completed" ? "Completed order" : "New order",
        });
      }

      items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setFeed(items);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const query = q.trim().toLowerCase();
  const locLga = loc.lga?.trim().toLowerCase();
  const locState = loc.state?.trim().toLowerCase();
  const filtered = feed.filter((it) => {
    if (cat !== "All" && it.category !== cat) return false;
    if (query && !it.title.toLowerCase().includes(query)) return false;
    if (locLga || locState) {
      const l = (it.location ?? "").toLowerCase();
      if (locLga && !l.includes(locLga)) return false;
      if (locState && !l.includes(locState)) return false;
    }
    return true;
  });

  return (
    <MobileShell>
      <div className="p-4 space-y-5">
        <div>
          <p className="text-muted-foreground text-sm">Hello,</p>
          <h1 className="text-2xl font-bold">{profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search the feed..." className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <LocationFilter value={loc} onChange={setLoc} />
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition",
                cat === c ? "bg-primary text-primary-foreground border-primary shadow-[var(--glow-primary)]" : "bg-card text-foreground border-border",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Live Feed</h2>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nothing here yet. Check back soon.</p>
          )}
          {filtered.map((it) => <FeedCard key={it.id} item={it} />)}
        </section>
      </div>

      {isFarmer && (
        <Link
          to="/create-listing"
          aria-label="Add listing"
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--glow-primary)] active:scale-95 transition"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}
    </MobileShell>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const Icon = item.kind === "listing" ? Tag : item.kind === "bundle" ? Package2 : item.kind === "split" ? Users : CheckCircle2;
  const body = (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex gap-3 p-3">
      {item.image ? (
        <img src={item.image} alt={item.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon className="w-7 h-7 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-primary font-bold">
          <Icon className="w-3 h-3" /> {item.meta}
        </div>
        <p className="font-semibold text-sm mt-0.5 line-clamp-2">{item.title}</p>
        {item.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>}
        <div className="flex items-center justify-between mt-1">
          {item.price != null && item.kind !== "order" ? (
            <p className="text-primary font-bold text-sm">
              {formatPrice(item.price)}
              {item.unit && <span className="text-muted-foreground text-xs font-normal">/{item.unit}</span>}
            </p>
          ) : <span />}
          <span className="text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span>
        </div>
        {item.location && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-3 h-3" />{item.location}
          </p>
        )}
      </div>
    </div>
  );
  if (item.href) {
    return <Link to={item.href.to} params={item.href.params}>{body}</Link>;
  }
  return body;
}