import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Product = { id: string; name: string; photo_url: string | null; price: number; quantity: number; vendor: { name: string } | null };

export const Route = createFileRoute("/product/$id")({ component: ProductPage });

function ProductPage() {
  const { id } = useParams({ from: "/product/$id" });
  const [p, setP] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("products").select("id,name,photo_url,price,quantity,vendor:vendors(name)").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data as unknown as Product | null);
      setLoading(false);
    });
  }, [id]);

  return (
    <MobileShell>
      <div className="relative aspect-square bg-muted">
        <Link to="/" className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {p?.photo_url && <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        {loading ? <div className="h-6 w-40 bg-muted rounded animate-pulse" /> : p ? (
          <>
            <div className="text-xs text-muted-foreground">{p.vendor?.name}</div>
            <h1 className="text-2xl font-bold mt-1">{p.name}</h1>
            <div className="mt-2 text-3xl font-black text-primary">{formatPrice(Number(p.price))}</div>
            <div className="mt-1 text-sm text-muted-foreground">{p.quantity} available</div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-border rounded-full px-1 py-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full grid place-items-center"><Minus className="w-4 h-4" /></button>
                <span className="w-6 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(p.quantity, qty + 1))} className="w-8 h-8 rounded-full grid place-items-center"><Plus className="w-4 h-4" /></button>
              </div>
              <Button className="flex-1" size="lg" onClick={() => { addToCart(p.id, qty); toast.success("Added to cart"); }}>
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to cart
              </Button>
            </div>
          </>
        ) : <div className="text-muted-foreground">Product not found.</div>}
      </div>
    </MobileShell>
  );
}
