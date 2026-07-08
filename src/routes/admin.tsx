import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus, Leaf, X } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: Admin });

type Tier = { id: string; min_km: number; max_km: number; delivery_fee: number; sort_order: number };
type Vendor = { id: string; name: string; email: string; phone: string; status: string; bank_name: string | null; account_number: string | null; account_name: string | null };
type Order = { id: string; order_number: string; total: number; delivery_status: string; escrow_status: string; created_at: string; vendor: { name: string } | null; buyer: { name: string } | null };
type Dispute = { id: string; reason: string; status: string; created_at: string; order: { id: string; order_number: string; total: number } | null; buyer: { name: string; phone: string | null } | null };
type Farm = { id: string; name: string; price: number; quantity: number; is_sold_out: boolean; photo_url: string | null; description: string | null; farm_delivery_fee: number | null };

function Admin() {
  const { user, role, loading } = useAuth();
  const [tab, setTab] = useState<"delivery" | "vendors" | "farm" | "orders" | "disputes">("delivery");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmForm, setFarmForm] = useState<Farm | null>(null);
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [newTier, setNewTier] = useState({ min_km: "", max_km: "", fee: "" });

  const load = useCallback(async () => {
    const [t, v, o, d, f] = await Promise.all([
      supabase.from("delivery_tiers").select("*").order("sort_order"),
      supabase.from("vendors").select("id,name,email,phone,status,bank_name,account_number,account_name").order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_number,total,delivery_status,escrow_status,created_at,vendor:vendors(name),buyer:buyers(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("disputes").select("id,reason,status,created_at,order:orders(id,order_number,total),buyer:buyers(name,phone)").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,price,quantity,is_sold_out,photo_url,description,farm_delivery_fee").eq("is_farm_product", true).order("created_at", { ascending: false }),
    ]);
    setTiers(((t.data ?? []) as unknown as Tier[]).map((x) => ({ ...x, min_km: Number(x.min_km), max_km: Number(x.max_km), delivery_fee: Number(x.delivery_fee) })));
    setVendors((v.data ?? []) as Vendor[]);
    setOrders((o.data ?? []) as unknown as Order[]);
    setDisputes((d.data ?? []) as unknown as Dispute[]);
    setFarms((f.data ?? []) as unknown as Farm[]);
  }, []);
  useEffect(() => { if (role === "admin") load(); }, [role, load]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user || role !== "admin") return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div><p className="text-sm text-muted-foreground mb-3">Admins only.</p><Link to="/" className="text-primary">Home</Link></div>
    </div>
  );

  const addTier = async () => {
    const minKm = Number(newTier.min_km);
    const maxKm = Number(newTier.max_km);
    const fee = Number(newTier.fee);
    if (isNaN(minKm) || isNaN(maxKm) || isNaN(fee) || maxKm <= minKm) return toast.error("Enter valid tier");
    const sortOrder = tiers.length + 1;
    const { error } = await supabase.from("delivery_tiers").insert({ min_km: minKm, max_km: maxKm, delivery_fee: fee, sort_order: sortOrder });
    if (error) return toast.error(error.message);
    setNewTier({ min_km: "", max_km: "", fee: "" }); load();
  };
  const updateTier = async (t: Tier, patch: Partial<Tier>) => {
    const { error } = await supabase.from("delivery_tiers").update(patch).eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };
  const deleteTier = async (t: Tier) => {
    if (!confirm(`Delete tier ${t.min_km}–${t.max_km}km?`)) return;
    await supabase.from("delivery_tiers").delete().eq("id", t.id);
    load();
  };
  const setVendorStatus = async (v: Vendor, status: string) => {
    await supabase.from("vendors").update({ status }).eq("id", v.id);
    toast.success(status);
    load();
  };
  const resolveDispute = async (d: Dispute, refund: boolean) => {
    if (!d.order) return;
    if (refund) {
      await supabase.from("orders").update({ escrow_status: "refunded", payment_status: "refunded" }).eq("id", d.order.id);
    } else {
      await supabase.from("orders").update({ escrow_status: "released" }).eq("id", d.order.id);
    }
    await supabase.from("disputes").update({ status: "resolved", resolution: refund ? "refunded" : "released" }).eq("id", d.id);
    toast.success(refund ? "Refunded buyer" : "Released to vendor");
    load();
  };

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto pb-10">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-lg">Admin</h1>
        <Link to="/" className="text-xs text-muted-foreground">Home</Link>
      </header>
      <div className="px-4 pt-3">
        <div className="grid grid-cols-5 bg-muted rounded-full p-1 text-xs font-medium">
          {(["delivery","vendors","farm","orders","disputes"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`py-2 rounded-full capitalize ${tab === t ? "bg-background shadow" : "text-muted-foreground"}`}>{t}{t === "disputes" && disputes.length > 0 ? ` (${disputes.length})` : ""}</button>
          ))}
        </div>
      </div>
      <main className="p-4 space-y-3">
        {tab === "delivery" && (
          <>
            <p className="text-xs text-muted-foreground">Distance tiers set delivery fees automatically. The highest tier's max km is the delivery radius — vendors and orders beyond it are blocked.</p>
            <div className="bg-card border border-border rounded-2xl p-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div><label className="text-xs text-muted-foreground">Min km</label><Input inputMode="decimal" value={newTier.min_km} onChange={(e) => setNewTier({ ...newTier, min_km: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Max km</label><Input inputMode="decimal" value={newTier.max_km} onChange={(e) => setNewTier({ ...newTier, max_km: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">₦ fee</label><Input inputMode="numeric" value={newTier.fee} onChange={(e) => setNewTier({ ...newTier, fee: e.target.value.replace(/\D/g, "") })} /></div>
              <Button onClick={addTier}>Add</Button>
            </div>
            {tiers.map((t) => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Input inputMode="decimal" defaultValue={t.min_km} onBlur={(e) => Number(e.target.value) !== t.min_km && updateTier(t, { min_km: Number(e.target.value) })} />
                <Input inputMode="decimal" defaultValue={t.max_km} onBlur={(e) => Number(e.target.value) !== t.max_km && updateTier(t, { max_km: Number(e.target.value) })} />
                <Input inputMode="numeric" defaultValue={t.delivery_fee} onBlur={(e) => Number(e.target.value) !== t.delivery_fee && updateTier(t, { delivery_fee: Number(e.target.value) })} />
                <button onClick={() => deleteTier(t)} className="text-destructive px-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </>
        )}
        {tab === "vendors" && vendors.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-2xl p-3 space-y-1">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.email} · {v.phone}</div>
                <div className="text-xs text-muted-foreground">{v.bank_name} · {v.account_number} · {v.account_name}</div>
              </div>
              <span className="text-xs uppercase font-semibold text-primary">{v.status}</span>
            </div>
            <div className="flex gap-2 pt-1">
              {v.status !== "suspended" ? (
                <Button size="sm" variant="outline" onClick={() => setVendorStatus(v, "suspended")}>Suspend</Button>
              ) : (
                <Button size="sm" onClick={() => setVendorStatus(v, "active")}>Reinstate</Button>
              )}
              <Link to="/vendor/$id" params={{ id: v.id }} className="text-xs text-primary self-center">View store →</Link>
            </div>
          </div>
        ))}
        {tab === "orders" && orders.map((o) => (
          <div key={o.id} className="bg-card border border-border rounded-2xl p-3 text-sm">
            <div className="flex justify-between font-semibold">
              <span>#{o.order_number}</span><span className="text-primary">{formatPrice(Number(o.total))}</span>
            </div>
            <div className="text-xs text-muted-foreground">{o.buyer?.name} → {o.vendor?.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{o.delivery_status.replace(/_/g," ")} · escrow {o.escrow_status}</div>
          </div>
        ))}
        {tab === "disputes" && (disputes.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No open disputes.</div>
        ) : disputes.map((d) => (
          <div key={d.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex justify-between font-semibold text-sm">
              <span>#{d.order?.order_number}</span><span className="text-primary">{d.order ? formatPrice(Number(d.order.total)) : ""}</span>
            </div>
            <div className="text-xs text-muted-foreground">{d.buyer?.name} · {d.buyer?.phone}</div>
            <p className="text-sm">{d.reason}</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => resolveDispute(d, true)}>Refund buyer</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => resolveDispute(d, false)}>Release to vendor</Button>
            </div>
          </div>
        )))}
        {tab === "farm" && (
          <>
            <Button className="w-full" onClick={() => { setFarmForm(null); setShowFarmForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New farm listing
            </Button>
            {showFarmForm && (
              <FarmForm initial={farmForm} onDone={() => { setShowFarmForm(false); setFarmForm(null); load(); }} />
            )}
            {farms.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No farm listings yet.</div>
            ) : farms.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex gap-3">
                <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden">
                  {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 font-semibold truncate"><Leaf className="w-3.5 h-3.5 text-primary" />{p.name}</div>
                  <div className="text-sm text-primary font-bold">{formatPrice(Number(p.price))} · {p.quantity} left</div>
                  <div className="text-xs text-muted-foreground">Delivery {formatPrice(Number(p.farm_delivery_fee ?? 0))}</div>
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={async () => { await supabase.from("products").update({ is_sold_out: !p.is_sold_out }).eq("id", p.id); load(); }} className={`text-xs px-2 py-1 rounded-full border ${p.is_sold_out ? "bg-destructive text-destructive-foreground border-destructive" : "border-border"}`}>{p.is_sold_out ? "Sold out" : "In stock"}</button>
                    <button onClick={() => { setFarmForm(p); setShowFarmForm(true); }} className="text-xs px-2 py-1 rounded-full border border-border">Edit</button>
                    <button onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await supabase.from("products").delete().eq("id", p.id); load(); } }} className="text-xs px-2 py-1 rounded-full border border-border text-destructive"><Trash2 className="w-3 h-3 inline" /></button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function FarmForm({ initial, onDone }: { initial: Farm | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? ""));
  const [fee, setFee] = useState(String(initial?.farm_delivery_fee ?? ""));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const path = `farm/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("listing-images").upload(path, file);
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return toast.error("Add a photo");
    setBusy(true);
    const payload = {
      name,
      price: Number(price),
      quantity: Number(quantity),
      photo_url: photoUrl,
      description: description || null,
      is_farm_product: true,
      farm_delivery_fee: Number(fee),
      vendor_id: null as string | null,
    };
    if (initial) {
      const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { setBusy(false); return toast.error(error.message); }
    }
    setBusy(false);
    toast.success(initial ? "Updated" : "Live");
    onDone();
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-1"><Leaf className="w-4 h-4 text-primary" />{initial ? "Edit farm listing" : "New farm listing"}</h2>
        <button type="button" onClick={onDone} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <label className="aspect-video block bg-muted rounded-xl overflow-hidden cursor-pointer">
        {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">{uploading ? "Uploading…" : "Tap to upload photo"}</div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      <div><label className="text-xs text-muted-foreground">Product name</label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">Price ₦</label><Input required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} /></div>
        <div><label className="text-xs text-muted-foreground">Quantity</label><Input required inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} /></div>
      </div>
      <div><label className="text-xs text-muted-foreground">Delivery fee ₦ (per unit)</label><Input required inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} /></div>
      <div><label className="text-xs text-muted-foreground">Description (optional)</label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Origin, unit size, farm details" /></div>
      <Button type="submit" className="w-full" disabled={busy || uploading}>{busy ? "Saving…" : initial ? "Save" : "Publish"}</Button>
    </form>
  );
}
