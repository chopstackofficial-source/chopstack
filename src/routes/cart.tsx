import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { readCart, setQty, removeFromCart, subscribeCart } from "@/lib/cart";
import { readLocation } from "@/lib/location";
import { haversineKm, findTier, maxRadiusKm, type Tier } from "@/lib/distance";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, MapPin, AlertTriangle } from "lucide-react";

type Row = { id: string; name: string; price: number; photo_url: string | null; quantity: number; is_farm_product: boolean; farm_delivery_fee: number | null; vendor: { id: string; name: string; latitude: number | null; longitude: number | null } | null };

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [lines, setLines] = useState(readCart());
  const [tiers, setTiers] = useState<Tier[]>([]);
  const location = useMemo(() => readLocation(), []);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeCart(() => setLines(readCart())), []);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("delivery_tiers").select("id,min_km,max_km,delivery_fee").order("sort_order");
      setTiers(((t ?? []) as unknown as Tier[]).map((x) => ({ ...x, min_km: Number(x.min_km), max_km: Number(x.max_km), delivery_fee: Number(x.delivery_fee) })));
      if (lines.length === 0) { setRows([]); setLoading(false); return; }
      const { data } = await supabase.from("products").select("id,name,price,photo_url,quantity,is_farm_product,farm_delivery_fee,vendor:vendors(id,name,latitude,longitude)").in("id", lines.map((l) => l.productId));
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [lines]);

  const items = rows.map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })).filter((r) => r.qty > 0);
  const subtotal = items.reduce((s, r) => s + Number(r.price) * r.qty, 0);

  const maxKm = maxRadiusKm(tiers);
  const vendorMap = new Map<string, { lat: number; lng: number; name: string }>();
  items.forEach((r) => {
    if (r.is_farm_product) return;
    if (r.vendor?.id && r.vendor.latitude != null && r.vendor.longitude != null) {
      vendorMap.set(r.vendor.id, { lat: r.vendor.latitude, lng: r.vendor.longitude, name: r.vendor.name });
    }
  });
  let outOfRange = false;
  let deliveryFee = 0;
  const vendorFees: { name: string; fee: number; km: number }[] = [];
  // Farm items add their per-listing fee, no distance needed
  const farmFee = items.reduce((s, r) => r.is_farm_product ? s + Number(r.farm_delivery_fee ?? 0) * r.qty : s, 0);
  deliveryFee += farmFee;
  const hasNonFarm = items.some((r) => !r.is_farm_product);
  if (location && hasNonFarm) {
    for (const [, v] of vendorMap) {
      const km = haversineKm({ lat: location.lat, lng: location.lng }, v);
      if (km > maxKm) { outOfRange = true; break; }
      const tier = findTier(tiers, km);
      if (!tier) { outOfRange = true; break; }
      deliveryFee += tier.delivery_fee;
      vendorFees.push({ name: v.name, fee: tier.delivery_fee, km });
    }
  }
  const total = subtotal + (items.length ? deliveryFee : 0);
  const canCheckout = items.length > 0 && !outOfRange && (!hasNonFarm || (!!location && tiers.length > 0));

  return (
    <MobileShell>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Your cart</h1>
      </header>
      <main className="p-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-3">
            <ShoppingBag className="w-10 h-10 opacity-40" />
            Your cart is empty.
            <Link to="/" className="text-primary font-medium">Start shopping</Link>
          </div>
        ) : (
          <>
            {items.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-3 flex gap-3">
                <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden">
                  {r.photo_url && <img src={r.photo_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.vendor?.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-primary font-bold">{formatPrice(Number(r.price) * r.qty)}</div>
                    <div className="flex items-center gap-1 bg-muted rounded-full">
                      <button onClick={() => setQty(r.id, r.qty - 1)} className="w-7 h-7 grid place-items-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-5 text-center text-sm">{r.qty}</span>
                      <button onClick={() => setQty(r.id, Math.min(r.quantity, r.qty + 1))} className="w-7 h-7 grid place-items-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(r.id)} className="text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}

            <div className="bg-card border border-border rounded-2xl p-4 space-y-2 mt-4">
              {!location && hasNonFarm ? (
                <div className="flex items-center gap-2 text-sm text-destructive"><MapPin className="w-4 h-4" />Set a delivery location on the home page.</div>
              ) : outOfRange ? (
                <div className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 mt-0.5" /><span>We don't deliver to this area yet.</span></div>
              ) : null}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery{vendorFees.length > 1 ? ` (${vendorFees.length} vendors)` : ""}</span><span>{formatPrice(deliveryFee)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
            </div>
            <Button size="lg" className="w-full mt-3" disabled={!canCheckout} onClick={() => nav({ to: "/checkout" })}>Checkout</Button>
          </>
        )}
      </main>
    </MobileShell>
  );
}
