import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { readCart, setQty, removeFromCart, subscribeCart } from "@/lib/cart";
import { readZoneId } from "@/lib/zone";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

type Row = { id: string; name: string; price: number; photo_url: string | null; quantity: number; vendor: { id: string; name: string } | null };

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [lines, setLines] = useState(readCart());
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [zoneName, setZoneName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeCart(() => setLines(readCart())), []);

  useEffect(() => {
    (async () => {
      const zid = readZoneId();
      if (zid) {
        const { data: z } = await supabase.from("zones").select("name,delivery_fee").eq("id", zid).maybeSingle();
        if (z) { setDeliveryFee(Number(z.delivery_fee)); setZoneName(z.name); }
      }
      if (lines.length === 0) { setRows([]); setLoading(false); return; }
      const { data } = await supabase.from("products").select("id,name,price,photo_url,quantity,vendor:vendors(id,name)").in("id", lines.map((l) => l.productId));
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [lines]);

  const items = rows.map((r) => ({ ...r, qty: lines.find((l) => l.productId === r.id)?.qty ?? 0 })).filter((r) => r.qty > 0);
  const subtotal = items.reduce((s, r) => s + Number(r.price) * r.qty, 0);
  const total = subtotal + (items.length ? deliveryFee : 0);

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
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery {zoneName && `(${zoneName})`}</span><span>{formatPrice(deliveryFee)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
            </div>
            <Button size="lg" className="w-full mt-3" onClick={() => nav({ to: "/checkout" })}>Checkout</Button>
          </>
        )}
      </main>
    </MobileShell>
  );
}
