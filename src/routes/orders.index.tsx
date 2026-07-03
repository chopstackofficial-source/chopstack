import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

type Order = { id: string; order_number: string; total: number; delivery_status: string; created_at: string };

export const Route = createFileRoute("/orders/")({ component: OrdersPage });
function OrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,order_number,total,delivery_status,created_at").eq("buyer_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [user]);
  return (
    <MobileShell>
      <header className="px-4 py-3 border-b border-border"><h1 className="font-bold text-lg">Your orders</h1></header>
      <main className="p-4 space-y-3">
        {loading ? null : !user ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            <p className="mb-3">Sign in to see your orders.</p>
            <Link to="/login" className="text-primary font-medium">Log in</Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No orders yet.</div>
        ) : orders.map((o) => (
          <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">Order #{o.order_number}</div>
                <div className="text-xs text-muted-foreground capitalize">{o.delivery_status.replaceAll("_", " ")}</div>
              </div>
              <div className="text-primary font-bold">{formatPrice(Number(o.total))}</div>
            </div>
          </Link>
        ))}
      </main>
    </MobileShell>
  );
}
