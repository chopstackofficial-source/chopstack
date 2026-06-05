import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/create-listing")({ component: CreateListing });

const UNITS = ["kg", "bag", "bunch", "piece", "crate", "rubber", "bucket"];
const CATS = ["Vegetables", "Fruits", "Grains", "Tubers", "Poultry", "Dairy"];

function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ title: "", description: "", price: "", quantity_available: "", unit: "kg", category: "Vegetables", pickup_location: "", town: "", available_today: true, split_enabled: false, split_slots: "" });
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const images: string[] = [];
    if (files) {
      for (const file of Array.from(files)) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file);
        if (!error) images.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
      }
    }
    const { data, error } = await supabase.from("listings").insert({
      farmer_id: user.id, title: f.title, description: f.description, price: Number(f.price), quantity_available: Number(f.quantity_available),
      unit: f.unit, category: f.category, images, pickup_location: f.pickup_location, town: f.town || null, available_today: f.available_today,
      split_enabled: f.split_enabled, split_slots: f.split_enabled ? Number(f.split_slots) : null,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    if (f.split_enabled && data) {
      await supabase.from("splits").insert({ listing_id: data.id, farmer_id: user.id, total_slots: Number(f.split_slots) });
    }
    toast.success("Listing published");
    navigate({ to: "/my-listings" });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-10">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => history.back()}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold">Sell your produce</h1>
      </div>
      <form onSubmit={submit} className="p-4 space-y-3">
        <div>
          <Label>What are you selling?</Label>
          <Input required placeholder="e.g. Fresh Tomatoes" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div>
          <Label>Tell buyers more (optional)</Label>
          <Textarea placeholder="e.g. Freshly harvested today, big and ripe" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Price (₦)</Label><Input type="number" required placeholder="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div><Label>Per</Label><select className="w-full bg-input border border-border rounded-md h-9 px-3" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></div>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">Example: 1500 per bag means buyers pay ₦1,500 for each bag.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>How many available?</Label><Input type="number" required placeholder="0" value={f.quantity_available} onChange={(e) => setF({ ...f, quantity_available: e.target.value })} /></div>
          <div><Label>Category</Label><select className="w-full bg-input border border-border rounded-md h-9 px-3" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div>
          <Label>Where can buyers pick it up?</Label>
          <Input placeholder="e.g. Bodija Market, Ibadan" value={f.pickup_location} onChange={(e) => setF({ ...f, pickup_location: e.target.value })} />
        </div>
        <div>
          <Label>Town / Area</Label>
          <Input placeholder="e.g. Bodija" value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">Helps buyers nearby find your listing faster.</p>
        </div>
        <div className="bg-card p-3 rounded-xl border border-border space-y-1">
          <div className="flex items-center justify-between">
            <Label>Available today</Label>
            <Switch checked={f.available_today} onCheckedChange={(v) => setF({ ...f, available_today: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Turn off if buyers cannot pick this up today.</p>
        </div>
        <div>
          <Label>Add photos</Label>
          <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
          <p className="text-xs text-muted-foreground mt-1">Clear photos help your produce sell faster.</p>
        </div>
        <div className="bg-card p-3 rounded-xl border border-border space-y-1">
          <div className="flex items-center justify-between">
            <Label>Let buyers team up to buy</Label>
            <Switch checked={f.split_enabled} onCheckedChange={(v) => setF({ ...f, split_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Turn this on if buyers can share one big order (e.g. split a bag).</p>
        </div>
        {f.split_enabled && (
          <div>
            <Label>How many people can share it?</Label>
            <Input type="number" min={2} required placeholder="e.g. 4" value={f.split_slots} onChange={(e) => setF({ ...f, split_slots: e.target.value })} />
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Posting..." : "Post listing"}</Button>
      </form>
    </div>
  );
}