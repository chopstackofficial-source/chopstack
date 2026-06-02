import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/app/BottomNav";
import { cn } from "@/lib/utils";
import { formatPrice, formatDate } from "@/lib/format";

export const Route = createFileRoute("/manage-orders")({ component: ManageOrders });

const TABS = [
  { key: "all", label: "All", statuses: ["pending", "accepted", "meetup_scheduled", "completed", "cancelled", "declined"] },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "active", label: "Active", statuses: ["accepted", "meetup_scheduled"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "declined"] },
] as const;

function ManageOrders() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("orders").select("*, listings(title), bundles(title)").eq("farmer_id", user.id).order("created_at", { ascending: false });
      const rows = (data ?? []).filter((o: any) =>
        (o.listing_id && o.listings) || (o.bundle_id && o.bundles)
      );
      const buyerIds = Array.from(new Set(rows.map((o: any) => o.buyer_id).filter(Boolean)));
      let buyers: Record<string, string> = {};
      if (buyerIds.length) {
        const { data: us } = await supabase.from("users").select("id, full_name").in("id", buyerIds);
        buyers = Object.fromEntries((us ?? []).map((u: any) => [u.id, u.full_name]));
      }
      setAllOrders(rows.map((o: any) => ({ ...o, buyer_name: buyers[o.buyer_id] })));
    })();
  }, [user]);

  const countFor = (key: typeof TABS[number]["key"]) => {
    const s = TABS.find((t) => t.key === key)!.statuses as readonly string[];
    return allOrders.filter((o) => s.includes(o.status)).length;
  };
  const statuses = TABS.find((t) => t.key === tab)!.statuses as readonly string[];
  const orders = allOrders.filter((o) => statuses.includes(o.status));

  return (
    <MobileShell>
      <div className="p-4 space-y-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-1 bg-card p-1 rounded-lg border border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex-1 whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium", tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {t.label} <span className="opacity-70">({countFor(t.key)})</span>
            </button>
          ))}
        </div>
        {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>}
        {orders.map((o) => (
          <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block bg-card border border-border rounded-xl p-3">
            <div className="flex gap-2 mb-1">
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">{o.order_type}</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary">{String(o.status).replace("_", " ")}</span>
            </div>
            <p className="font-semibold">{o.listings?.title || o.bundles?.title}</p>
            <p className="text-xs text-muted-foreground">{o.buyer_name || "Buyer"} • {formatDate(o.created_at)}</p>
            <p className="text-primary font-bold mt-1">{formatPrice(Number(o.total_price))}</p>
          </Link>
        ))}
      </div>
    </MobileShell>
  );
}