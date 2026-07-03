import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderItem = { id: string; name_snapshot: string; unit_price: number; quantity: number };
type Order = { id: string; order_number: string; total: number; subtotal: number; delivery_fee: number; delivery_status: string; escrow_status: string; payment_status: string; delivered_at: string | null; vendor: { name: string } | null; items: OrderItem[] };

const STEPS = ["pending", "packed", "out_for_delivery", "delivered"];

export const Route = createFileRoute("/orders/$id")({ component: OrderDetail });
function OrderDetail() {
  const { id } = useParams({ from: "/orders/$id" });
  const [o, setO] = useState<Order | null>(null);
  const load = () => supabase.from("orders").select("id,order_number,total,subtotal,delivery_fee,delivery_status,escrow_status,payment_status,delivered_at,vendor:vendors(name)").eq("id", id).maybeSingle().then(async ({ data }) => {
    if (!data) return setO(null);
    const { data: items } = await supabase.from("order_items").select("id,name_snapshot,unit_price,quantity").eq("order_id", id);
    setO({ ...(data as any), items: (items ?? []) as OrderItem[] });
  });
  useEffect(() => { load(); }, [id]);

  const confirm = async () => {
    const { error } = await supabase.from("orders").update({ escrow_status: "released" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment released to vendor");
    load();
  };
  const dispute = async () => {
    const reason = prompt("What went wrong?");
    if (!reason) return;
    const { error } = await supabase.from("orders").update({ escrow_status: "disputed" }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("disputes").insert({ order_id: id, buyer_id: (await supabase.auth.getUser()).data.user!.id, reason });
    toast.success("Dispute submitted");
    load();
  };

  if (!o) return <MobileShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></MobileShell>;
  const stepIdx = STEPS.indexOf(o.delivery_status);
  return (
    <MobileShell>
      <header className="px-4 py-3 border-b border-border">
        <Link to="/orders" className="text-xs text-muted-foreground">← Orders</Link>
        <h1 className="font-bold text-lg mt-1">Order #{o.order_number}</h1>
        <div className="text-xs text-muted-foreground">{o.vendor?.name}</div>
      </header>
      <main className="p-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 rounded-full grid place-items-center text-[10px] ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                <div className="text-[10px] mt-1 text-center capitalize">{s.replaceAll("_", " ")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          {o.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span>{it.name_snapshot} × {it.quantity}</span>
              <span>{formatPrice(it.unit_price * it.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(Number(o.subtotal))}</span></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><span>{formatPrice(Number(o.delivery_fee))}</span></div>
          <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatPrice(Number(o.total))}</span></div>
        </div>
        {o.delivery_status === "delivered" && o.escrow_status === "held" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Confirm delivery to release payment, or open a dispute within 24 hours.</p>
            <Button className="w-full" onClick={confirm}>Confirm delivery</Button>
            <Button className="w-full" variant="outline" onClick={dispute}>Open dispute</Button>
          </div>
        )}
        {o.escrow_status === "released" && <p className="text-center text-sm text-primary">Payment released to vendor.</p>}
        {o.escrow_status === "disputed" && <p className="text-center text-sm text-destructive">Dispute open — admin will review.</p>}
      </main>
    </MobileShell>
  );
}
