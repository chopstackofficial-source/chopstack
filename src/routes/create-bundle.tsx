import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";

export const Route = createFileRoute("/create-bundle")({ component: CreateBundle });

const AUDIENCES = ["all", "restaurants", "caterers", "households"];

function CreateBundle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ title: "", description: "", price: "", target_audience: "all" });
  const [items, setItems] = useState<{ item_name: string; quantity: string }[]>([{ item_name: "", quantity: "" }, { item_name: "", quantity: "" }]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const valid = items.filter((i) => i.item_name.trim() && i.quantity.trim());
    if (valid.length < 2) return toast.error("Add at least 2 items");
    setBusy(true);
    let cover_image: string | null = null;
    if (cover) {
      const path = `${user.id}/${Date.now()}-${cover.name}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, cover);
      if (!error) cover_image = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase.from("bundles").insert({
      farmer_id: user.id, title: f.title, description: f.description, price: Number(f.price), target_audience: f.target_audience, cover_image,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("bundle_items").insert(valid.map((it) => ({ ...it, bundle_id: data.id })));
    toast.success("Bundle published");
    navigate({ to: "/my-listings" });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-10">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => history.back()}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold">New Bundle</h1>
      </div>
      <form onSubmit={submit} className="p-4 space-y-3">
        <div><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Starter Kitchen Pack" /></div>
        <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fixed price</Label><Input type="number" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div><Label>Audience</Label><select className="w-full bg-input border border-border rounded-md h-9 px-3" value={f.target_audience} onChange={(e) => setF({ ...f, target_audience: e.target.value })}>{AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
        </div>
        <div><Label>Cover image</Label><Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></div>
        <div>
          <Label>Items (minimum 2)</Label>
          <div className="space-y-2 mt-1">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Item (e.g. Rice)" value={it.item_name} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, item_name: e.target.value } : x))} />
                <Input placeholder="Qty (e.g. 1 rubber)" value={it.quantity} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} />
                {items.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { item_name: "", quantity: "" }])}><Plus className="w-4 h-4" /> Add item</Button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Publishing..." : "Publish bundle"}</Button>
      </form>
    </div>
  );
}