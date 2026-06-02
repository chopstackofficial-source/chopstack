import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/app/BottomNav";
import { Package2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bundles/")({ component: BundlesList });

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "family", label: "Family" },
  { key: "weekly_basics", label: "Weekly Basics" },
  { key: "proteins", label: "Proteins" },
  { key: "party", label: "Party" },
  { key: "student", label: "Student" },
] as const;

function BundlesList() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [cat, setCat] = useState<typeof CATEGORIES[number]["key"]>("all");

  useEffect(() => {
    let q = supabase.from("bundles").select("*, users!bundles_farmer_id_fkey(full_name), bundle_items(count)").eq("status", "active");
    if (cat !== "all") q = q.eq("category", cat);
    q.order("created_at", { ascending: false }).then(({ data }) => setBundles(data ?? []));
  }, [cat]);

  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Kitchen Bundles</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)} className={cn(
              "px-4 py-2 rounded-full text-sm font-medium capitalize border whitespace-nowrap",
              cat === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground",
            )}>{c.label}</button>
          ))}
        </div>
        <div className="grid gap-3">
          {bundles.length === 0 && <p className="text-sm text-muted-foreground">No bundles available.</p>}
          {bundles.map((b) => (
            <Link key={b.id} to="/bundles/$id" params={{ id: b.id }} className="bg-card rounded-xl overflow-hidden border border-border flex">
              {b.cover_image ? (
                <img src={b.cover_image} className="w-28 h-28 object-cover" alt={b.title} />
              ) : (
                <div className="w-28 h-28 bg-secondary flex items-center justify-center"><Package2 className="w-8 h-8 text-primary" /></div>
              )}
              <div className="p-3 flex-1">
                {b.category && (
                  <span className="text-[10px] uppercase tracking-wide text-primary font-bold">{b.category.replace("_", " ")}</span>
                )}
                <h3 className="font-semibold truncate">{b.title}</h3>
                <p className="text-primary font-bold mt-1">{formatPrice(Number(b.price))}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.bundle_items?.[0]?.count ?? 0} items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}