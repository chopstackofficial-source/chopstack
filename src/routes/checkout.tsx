import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { readCart } from "@/lib/cart";
import { readLocation } from "@/lib/location";
import { haversineKm, findTier, maxRadiusKm, type Tier } from "@/lib/distance";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initPaystackCheckout } from "@/lib/paystack.functions";

type Row = { id: string; name: string; price: number; vendor_id: string | null; quantity: number; is_farm_product: boolean; farm_delivery_fee: number | null; vendor: { latitude: number | null; longitude: number | null } | null };

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const location = useMemo(() => readLocation(), []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const lines = readCart();
    if (lines.length === 0) { nav({ to: "/cart" }); return; }
    if (!location) { nav({ to: "/" }); return; }
    (async () => {
      const { data: t } = await supabase.from("delivery_tiers").select("id,min_km,max_km,delivery_fee").order("sort_order");
      setTiers(((t ?? []) as unknown as Tier[]).map((x) => ({ ...x, min_km: Number(x.min_km), max_km: Number(x.max_km), delivery_fee: Number(x.delivery_fee) })));
      const { data } = await supabase.from("products").select("id,name,price,vendor_id,quantity,is_farm_product,farm_delivery_fee,vendor:vendors(latitude,longitude)").in("id", lines.map((l) => l.productId));
      setRows((data ?? []).map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })) as unknown as Row[]);
    })();
  }, [nav, location]);

  const lines = readCart();
  const items = rows.map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })).filter((r) => r.qty > 0);
  const subtotal = items.reduce((s, r) => s + Number(r.price) * r.qty, 0);

  const maxKm = maxRadiusKm(tiers);
  const vendorFees = new Map<string, number>();
  let outOfRange = false;
  const nonFarm = items.filter((r) => !r.is_farm_product);
  const hasNonFarm = nonFarm.length > 0;
  if (hasNonFarm && location && tiers.length) {
    const seen = new Set<string>();
    for (const r of nonFarm) {
      if (!r.vendor_id || seen.has(r.vendor_id)) continue;
      seen.add(r.vendor_id);
      const v = r.vendor;
      if (!v || v.latitude == null || v.longitude == null) { outOfRange = true; break; }
      const km = haversineKm({ lat: location.lat, lng: location.lng }, { lat: v.latitude, lng: v.longitude });
      if (km > maxKm) { outOfRange = true; break; }
      const tier = findTier(tiers, km);
      if (!tier) { outOfRange = true; break; }
      vendorFees.set(r.vendor_id, tier.delivery_fee);
    }
  }
  const farmFee = items.reduce((s, r) => r.is_farm_product ? s + Number(r.farm_delivery_fee ?? 0) * r.qty : s, 0);
  const deliveryFee = Array.from(vendorFees.values()).reduce((a, b) => a + b, 0) + farmFee;
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (!user) return;
    if (hasNonFarm && !location) return toast.error("Set your delivery location first");
    if (outOfRange) return toast.error("Some vendors are outside our delivery range");
    if (items.length === 0) return toast.error("Cart is empty");
    setBusy(true);
    try {
      const callbackUrl = `${window.location.origin}/checkout/callback`;
      const res = await initPaystackCheckout({
        data: {
          lat: location?.lat ?? 0,
          lng: location?.lng ?? 0,
          address: location?.address ?? "Farm delivery",
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
          <div className="font-semibold line-clamp-2">{location?.address || "Set location"}</div>
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
        {outOfRange && <p className="text-sm text-destructive">We don't deliver to this area yet.</p>}
        <p className="text-xs text-muted-foreground">Payment via Paystack. Funds are held in escrow and released after delivery.</p>
        <Button size="lg" className="w-full" disabled={busy || outOfRange || (hasNonFarm && !location)} onClick={placeOrder}>{busy ? "Placing order…" : `Pay ${formatPrice(total)}`}</Button>
      </main>
    </MobileShell>
  );
}
