import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { toast } from "sonner";

type Vendor = { id: string; name: string; photo_url: string | null; status: string };
type Product = { id: string; name: string; price: number; photo_url: string | null; quantity: number; is_sold_out: boolean };

export const Route = createFileRoute("/vendor/$id")({ component: VendorStore });

function VendorStore() {
  const { id } = useParams({ from: "/vendor/$id" });
  const [v, setV] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data: vendor } = await supabase.from("vendors").select("id,name,photo_url,status").eq("id", id).maybeSingle();
      setV(vendor as Vendor | null);
      const { data: ps } = await supabase.from("products").select("id,name,price,photo_url,quantity,is_sold_out").eq("vendor_id", id).eq("is_sold_out", false).gt("quantity", 0).order("created_at", { ascending: false });
      setProducts((ps ?? []) as Product[]);
    })();
  }, [id]);

  const add = (p: Product) => {
    addToCart(p.id, 1);
    setAdded((s) => ({ ...s, [p.id]: true }));
    toast.success(`${p.name} added`);
    setTimeout(() => setAdded((s) => ({ ...s, [p.id]: false })), 1000);
  };

  if (!v) return <MobileShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></MobileShell>;

  return (
    <MobileShell>
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
        <Link to="/" className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="absolute -bottom-8 left-4 w-20 h-20 rounded-2xl bg-card border-4 border-background overflow-hidden">
          {v.photo_url ? <img src={v.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-3xl font-black text-muted-foreground">{v.name[0]}</div>}
        </div>
      </div>
      <div className="px-4 pt-10 pb-2">
        <h1 className="text-xl font-black">{v.name}</h1>
        <p className="text-xs text-muted-foreground">{products.length} items in stock</p>
      </div>
      <main className="px-3 pb-6">
        {products.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nothing in stock right now.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
                <Link to="/product/$id" params={{ id: p.id }} className="block aspect-square bg-muted overflow-hidden">
                  {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />}
                </Link>
                <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                  <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-base font-black text-primary">{formatPrice(Number(p.price))}</div>
                    <button onClick={() => add(p)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
                      {added[p.id] ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}