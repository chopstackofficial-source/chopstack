import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { readCart } from "@/lib/cart";
import { readZoneId } from "@/lib/zone";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initPaystackCheckout } from "@/lib/paystack.functions";

type Row = { id: string; name: string; price: number; vendor_id: string; quantity: number };

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [zoneName, setZoneName] = useState("");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const lines = readCart();
    if (lines.length === 0) { nav({ to: "/cart" }); return; }
    (async () => {
      const zid = readZoneId();
      setZoneId(zid);
      if (zid) {
        const { data: z } = await supabase.from("zones").select("name,delivery_fee").eq("id", zid).maybeSingle();
        if (z) { setDeliveryFee(Number(z.delivery_fee)); setZoneName(z.name); }
      }
      const { data } = await supabase.from("products").select("id,name,price,vendor_id,quantity").in("id", lines.map((l) => l.productId));
      setRows((data ?? []).map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })) as unknown as Row[]);
    })();
  }, [nav]);

  const lines = readCart();
  const items = rows.map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })).filter((r) => r.qty > 0);
  const subtotal = items.reduce((s, r) => s + Number(r.price) * r.qty, 0);
  const total = subtotal + deliveryFee;

  // Group by vendor
  const grouped = items.reduce((acc, r) => {
    (acc[r.vendor_id] ||= []).push(r);
    return acc;
  }, {} as Record<string, typeof items>);

  const placeOrder = async () => {
    if (!user) return;
    if (!zoneId) return toast.error("Pick a delivery zone first");
    if (items.length === 0) return toast.error("Cart is empty");
    setBusy(true);
    try {
      const callbackUrl = `${window.location.origin}/checkout/callback`;
      const res = await initPaystackCheckout({
        data: {
          zoneId,
          callbackUrl,
          items: items.map((r) => ({ productId: r.id, qty: r.qty })),
        },
      });
      window.location.href = res.authorization_url;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  if (authLoading) return <MobileShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></MobileShell>;

  if (!user) {
    return (
      <MobileShell>
        <div className="p-6 max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold mb-2">Sign in to check out</h1>
          <p className="text-sm text-muted-foreground mb-6">Create an account or log in to place your order.</p>
          <div className="flex flex-col gap-2">
            <Link to="/signup"><Button className="w-full" size="lg">Create account</Button></Link>
            <Link to="/login"><Button className="w-full" size="lg" variant="outline">Log in</Button></Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Checkout</h1>
      </header>
      <main className="p-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs uppercase text-muted-foreground">Delivering to</div>
          <div className="font-semibold">{zoneName || "Select zone"}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex justify-between text-sm">
              <span>{r.name} × {r.qty}</span>
              <span>{formatPrice(Number(r.price) * r.qty)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>
          <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">Payment via Paystack. Funds are held in escrow and released after delivery.</p>
        <Button size="lg" className="w-full" disabled={busy} onClick={placeOrder}>{busy ? "Placing order…" : `Pay ${formatPrice(total)}`}</Button>
      </main>
    </MobileShell>
  );
}
