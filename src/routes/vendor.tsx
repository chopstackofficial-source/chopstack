import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { Plus, Pencil, Trash2, X, LogOut, MapPin } from "lucide-react";
import { LocationPicker } from "@/components/app/LocationPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor")({ component: VendorDashboard });

type Product = { id: string; name: string; price: number; quantity: number; is_sold_out: boolean; photo_url: string | null };
type Order = {
  id: string; order_number: string; total: number; delivery_status: string; escrow_status: string;
  created_at: string; delivered_at: string | null; escrow_release_at: string | null;
  buyer: { name: string; phone: string | null; delivery_address: string | null } | null;
  distance_km: number | null;
  items: { id: string; name_snapshot: string; quantity: number; unit_price: number }[];
};

function VendorDashboard() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, vendor, loading, refresh } = useAuth();
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showLocation, setShowLocation] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [p, o] = await Promise.all([
      supabase.from("products").select("id,name,price,quantity,is_sold_out,photo_url").eq("vendor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_number,total,delivery_status,escrow_status,created_at,delivered_at,escrow_release_at,distance_km,buyer:buyers(name,phone,delivery_address)").eq("vendor_id", user.id).eq("payment_status", "paid").order("created_at", { ascending: false }),
    ]);
    setProducts((p.data ?? []) as unknown as Product[]);
    const orderRows = (o.data ?? []) as unknown as Order[];
    const withItems = await Promise.all(orderRows.map(async (row) => {
      const { data: items } = await supabase.from("order_items").select("id,name_snapshot,quantity,unit_price").eq("order_id", row.id);
      return { ...row, items: items ?? [] };
    }));
    setOrders(withItems);
  }, [user]);

  useEffect(() => {
    if (user && location.pathname === "/vendor") loadAll();
  }, [user, location.pathname, loadAll]);

  if (location.pathname !== "/vendor") return <Outlet />;

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">Sign in as a vendor.</p>
        <Link to="/login" className="text-primary font-medium">Log in</Link>
        <div className="text-xs mt-2 text-muted-foreground">Or <Link to="/vendor/signup" className="text-primary">register</Link></div>
      </div>
    </div>
  );
  if (!vendor) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="mb-3 text-sm">This account isn't registered as a vendor.</p>
        <Link to="/vendor/signup" className="text-primary font-medium">Register as vendor</Link>
      </div>
    </div>
  );
  if (vendor.status === "suspended") return (
    <div className="min-h-screen grid place-items-center p-6 text-center max-w-sm mx-auto">
      <div>
        <h1 className="text-lg font-bold mb-2">Account suspended</h1>
        <p className="text-sm text-muted-foreground">Contact support to restore your vendor account.</p>
      </div>
    </div>
  );

  const setStatus = async (id: string, status: "on_the_way" | "delivered") => {
    const now = new Date();
    const patch = status === "delivered"
      ? { delivery_status: status, delivered_at: now.toISOString(), escrow_release_at: new Date(now.getTime() + 4 * 3600 * 1000).toISOString() }
      : { delivery_status: status };
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    const o = orders.find((x) => x.id === id);
    if (o) {
      const msg = status === "on_the_way" ? `Order ${o.order_number} is on the way.` : `Order ${o.order_number} delivered. You have 4 hours to dispute if anything is wrong.`;
      await supabase.from("notifications").insert({ user_id: (await supabase.from("orders").select("buyer_id").eq("id", id).single()).data!.buyer_id, user_type: "buyer", title: msg, body: msg, deeplink: `/orders/${id}` });
    }
    toast.success("Updated");
    loadAll();
  };

  const toggleSoldOut = async (p: Product) => {
    await supabase.from("products").update({ is_sold_out: !p.is_sold_out }).eq("id", p.id);
    loadAll();
  };
  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    loadAll();
  };

  const saveLocation = async (loc: { lat: number; lng: number; address: string }) => {
    if (!user) return;
    const { error } = await supabase.from("vendors").update({ latitude: loc.lat, longitude: loc.lng, address: loc.address }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Store location updated");
    setShowLocation(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Vendor</div>
          <h1 className="font-bold">{vendor.name}</h1>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
      </header>
      <div className="px-4 pt-3">
        <button onClick={() => setShowLocation(true)} className="w-full flex items-center gap-2 text-sm bg-card border border-border rounded-2xl p-3 text-left">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Store location</div>
            <div className="line-clamp-1 font-medium">{vendor.address || (vendor.latitude != null ? `${vendor.latitude.toFixed(4)}, ${vendor.longitude?.toFixed(4)}` : "Set store location")}</div>
          </div>
          <span className="text-xs text-primary">Change</span>
        </button>
      </div>
      <Dialog open={showLocation} onOpenChange={setShowLocation}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Store location</DialogTitle></DialogHeader>
          <LocationPicker initial={vendor.latitude != null && vendor.longitude != null ? { lat: vendor.latitude, lng: vendor.longitude } : null} onConfirm={saveLocation} confirmLabel="Save store location" />
        </DialogContent>
      </Dialog>
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 bg-muted rounded-full p-1 text-sm font-medium">
          <button onClick={() => setTab("orders")} className={`py-2 rounded-full ${tab === "orders" ? "bg-background shadow" : "text-muted-foreground"}`}>Orders ({orders.length})</button>
          <button onClick={() => setTab("products")} className={`py-2 rounded-full ${tab === "products" ? "bg-background shadow" : "text-muted-foreground"}`}>Stock ({products.length})</button>
        </div>
      </div>

      {tab === "orders" ? (
        <main className="p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No orders yet. Stock will drive them in.</div>
          ) : orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">#{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{o.buyer?.name} · {o.buyer?.phone ?? "no phone"}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{o.distance_km != null ? `${o.distance_km}km · ` : ""}{o.buyer?.delivery_address}</div>
                </div>
                <div className="text-primary font-bold">{formatPrice(Number(o.total))}</div>
              </div>
              <div className="text-sm space-y-0.5">
                {o.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-muted-foreground">
                    <span>{it.name_snapshot} × {it.quantity}</span>
                    <span>{formatPrice(Number(it.unit_price) * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs uppercase tracking-wide font-semibold text-primary">
                {o.delivery_status.replace(/_/g, " ")}{o.escrow_status === "released" ? " · paid out" : o.escrow_status === "disputed" ? " · disputed" : ""}
              </div>
              <div className="flex gap-2 pt-1">
                {o.delivery_status === "confirmed" && <Button size="sm" className="flex-1" onClick={() => setStatus(o.id, "on_the_way")}>Mark on the way</Button>}
                {o.delivery_status === "on_the_way" && <Button size="sm" className="flex-1" onClick={() => setStatus(o.id, "delivered")}>Mark delivered</Button>}
              </div>
            </div>
          ))}
        </main>
      ) : (
        <main className="p-4 space-y-3">
          <Button className="w-full" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add stock
          </Button>
          {showForm && <ProductForm initial={editing} onDone={() => { setShowForm(false); setEditing(null); loadAll(); }} vendorId={user.id} />}
          {products.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No stock yet.</div>
          ) : products.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex gap-3">
              <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden">
                {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-sm text-primary font-bold">{formatPrice(Number(p.price))} · {p.quantity} left</div>
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => toggleSoldOut(p)} className={`text-xs px-2 py-1 rounded-full border ${p.is_sold_out ? "bg-destructive text-destructive-foreground border-destructive" : "border-border"}`}>{p.is_sold_out ? "Sold out" : "In stock"}</button>
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-xs px-2 py-1 rounded-full border border-border"><Pencil className="w-3 h-3 inline" /></button>
                  <button onClick={() => deleteProduct(p)} className="text-xs px-2 py-1 rounded-full border border-border text-destructive"><Trash2 className="w-3 h-3 inline" /></button>
                </div>
              </div>
            </div>
          ))}
        </main>
      )}
    </div>
  );
}

function ProductForm({ initial, onDone, vendorId }: { initial: Product | null; onDone: () => void; vendorId: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? ""));
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${vendorId}/${crypto.randomUUID()}-${file.name}`;
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
    const payload = { name, price: Number(price), quantity: Number(quantity), photo_url: photoUrl, vendor_id: vendorId };
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
        <h2 className="font-bold">{initial ? "Edit stock" : "New stock"}</h2>
        <button type="button" onClick={onDone} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div>
        <Label>Photo</Label>
        <label className="mt-1 aspect-square block bg-muted rounded-xl overflow-hidden cursor-pointer">
          {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : (
            <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">{uploading ? "Uploading…" : "Tap to upload"}</div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </label>
      </div>
      <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fresh tomatoes basket" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Price ₦</Label><Input required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label>Quantity</Label><Input required inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={busy || uploading}>{busy ? "Saving…" : initial ? "Save" : "Go live"}</Button>
    </form>
  );
}
