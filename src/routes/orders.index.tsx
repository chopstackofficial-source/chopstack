import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/app/BottomNav";
import { cn } from "@/lib/utils";
import { formatPrice, formatDate } from "@/lib/format";

export const Route = createFileRoute("/orders/")({ component: Orders });

const TABS = [
  { key: "all", label: "All", statuses: ["pending", "accepted", "meetup_scheduled", "completed", "cancelled", "declined"] },
  { key: "active", label: "Active", statuses: ["pending", "accepted", "meetup_scheduled"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "declined"] },
] as const;

function Orders() {
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("*, listings(title, images, category), bundles(title, cover_image)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        // Hide orders whose listing/bundle was deleted by the seller
        const visible = (data ?? []).filter((o: any) =>
          (o.listing_id && o.listings) || (o.bundle_id && o.bundles)
        );
        setAllOrders(visible);
      });
  }, [user]);

  useEffect(() => {
    const statuses = TABS.find((t) => t.key === tab)!.statuses as readonly string[];
    setOrders(allOrders.filter((o) => statuses.includes(o.status)));
  }, [tab, allOrders]);

  const countFor = (key: typeof TABS[number]["key"]) => {
    const s = TABS.find((t) => t.key === key)!.statuses as readonly string[];
    return allOrders.filter((o) => s.includes(o.status)).length;
  };

  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <div className="flex gap-1 bg-card p-1 rounded-lg border border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex-1 whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium", tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {t.label} <span className="opacity-70">({countFor(t.key)})</span>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No orders here.</p>}
          {orders.map((o) => {
            const img = o.listings?.images?.[0] || o.bundles?.cover_image;
            const title = o.listings?.title || o.bundles?.title || o.listings?.category || "Order";
            return (
              <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex gap-3 bg-card border border-border rounded-xl p-3">
                {img ? <img src={img} className="w-16 h-16 rounded-lg object-cover" alt="" /> : <div className="w-16 h-16 bg-secondary rounded-lg" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">{o.order_type}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{String(o.status).replace("_", " ")}</span>
                  </div>
                  <h3 className="font-semibold truncate mt-1">{title}</h3>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>{formatDate(o.created_at)}</span>
                    <span className="font-bold text-primary">{formatPrice(Number(o.total_price))}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}