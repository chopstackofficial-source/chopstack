import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/app/BottomNav";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/my-listings")({ component: MyListings });

function MyListings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"listings" | "bundles">("listings");
  const [items, setItems] = useState<any[]>([]);
  const table = tab === "listings" ? "listings" : "bundles";
  const load = useCallback(() => {
    if (!user) return;
    supabase.from(table).select("*").eq("farmer_id", user.id).neq("status", "deleted").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, [user, table]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete?")) return;
    const label = tab === "listings" ? "listing" : "bundle";
    const item = items.find((i) => i.id === id);
    const imageUrls: string[] = tab === "listings"
      ? (item?.images ?? [])
      : item?.cover_image ? [item.cover_image] : [];
    const paths = imageUrls
      .map((url: string) => {
        const m = url.match(/\/listing-images\/(.+)$/);
        return m ? decodeURIComponent(m[1]) : null;
      })
      .filter((p): p is string => !!p);
    if (paths.length) {
      await supabase.storage.from("listing-images").remove(paths);
    }
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`${label[0].toUpperCase() + label.slice(1)} deleted`);
    load();
  };

  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Catalog</h1>
          <Link to={tab === "listings" ? "/create-listing" : "/create-bundle"}>
            <Button size="sm"><Plus className="w-4 h-4" /> Add {tab === "listings" ? "listing" : "bundle"}</Button>
          </Link>
        </div>
        <div className="flex gap-1 bg-card p-1 rounded-lg border border-border">
          {(["listings", "bundles"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("flex-1 py-2 rounded-md text-sm capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Nothing yet.</p>}
          {items.map((it) => (
            <div key={it.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <Link to={tab === "listings" ? "/listings/$id" : "/bundles/$id"} params={{ id: it.id }}>
                {(it.images?.[0] || it.cover_image) ? <img src={it.images?.[0] || it.cover_image} className="w-full h-28 object-cover" alt="" /> : <div className="w-full h-28 bg-secondary" />}
                <div className="p-2">
                  <p className="font-semibold text-sm truncate">{it.title}</p>
                  <p className="text-primary font-bold text-sm">{formatPrice(Number(it.price))}</p>
                  <span className="text-[10px] uppercase text-muted-foreground">{it.status}</span>
                </div>
              </Link>
              <div className="p-2 pt-0 mt-auto">
                <Button size="sm" variant="destructive" className="w-full h-8 text-xs" onClick={() => remove(it.id)}>
                  Delete {tab === "listings" ? "listing" : "bundle"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}