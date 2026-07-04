import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: Admin });

type Zone = { id: string; name: string; delivery_fee: number; active: boolean };
type Vendor = { id: string; name: string; email: string; phone: string; status: string; bank_name: string | null; account_number: string | null; account_name: string | null };
type Order = { id: string; order_number: string; total: number; delivery_status: string; escrow_status: string; created_at: string; vendor: { name: string } | null; buyer: { name: string } | null };
type Dispute = { id: string; reason: string; status: string; created_at: string; order: { id: string; order_number: string; total: number } | null; buyer: { name: string; phone: string | null } | null };

function Admin() {
  const { user, role, loading } = useAuth();
  const [tab, setTab] = useState<"zones" | "vendors" | "orders" | "disputes">("zones");
  const [zones, setZones] = useState<Zone[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [newZone, setNewZone] = useState({ name: "", fee: "" });

  const load = useCallback(async () => {
    const [z, v, o, d] = await Promise.all([
      supabase.from("zones").select("*").order("name"),
      supabase.from("vendors").select("id,name,email,phone,status,bank_name,account_number,account_name").order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_number,total,delivery_status,escrow_status,created_at,vendor:vendors(name),buyer:buyers(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("disputes").select("id,reason,status,created_at,order:orders(id,order_number,total),buyer:buyers(name,phone)").eq("status", "open").order("created_at", { ascending: false }),
    ]);
    setZones((z.data ?? []) as Zone[]);
    setVendors((v.data ?? []) as Vendor[]);
    setOrders((o.data ?? []) as unknown as Order[]);
    setDisputes((d.data ?? []) as unknown as Dispute[]);
  }, []);
  useEffect(() => { if (role === "admin") load(); }, [role, load]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user || role !== "admin") return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div><p className="text-sm text-muted-foreground mb-3">Admins only.</p><Link to="/" className="text-primary">Home</Link></div>
    </div>
  );

  const addZone = async () => {
    if (!newZone.name.trim() || !newZone.fee) return;
    const { error } = await supabase.from("zones").insert({ name: newZone.name.trim(), delivery_fee: Number(newZone.fee), active: true });
    if (error) return toast.error(error.message);
    setNewZone({ name: "", fee: "" }); load();
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
        <div className="grid grid-cols-4 bg-muted rounded-full p-1 text-xs font-medium">
          {(["zones","vendors","orders","disputes"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`py-2 rounded-full capitalize ${tab === t ? "bg-background shadow" : "text-muted-foreground"}`}>{t}{t === "disputes" && disputes.length > 0 ? ` (${disputes.length})` : ""}</button>
          ))}
        </div>
      </div>
      <main className="p-4 space-y-3">
        {tab === "zones" && (
          <>
            <div className="bg-card border border-border rounded-2xl p-3 flex gap-2">
              <Input placeholder="Zone name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} />
              <Input placeholder="₦ fee" inputMode="numeric" value={newZone.fee} onChange={(e) => setNewZone({ ...newZone, fee: e.target.value.replace(/\D/g, "") })} />
              <Button onClick={addZone}>Add</Button>
            </div>
            {zones.map((z) => (
              <div key={z.id} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{z.name}</div>
                  <div className="text-xs text-muted-foreground">{formatPrice(z.delivery_fee)} delivery {z.active ? "" : "· inactive"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { await supabase.from("zones").update({ active: !z.active }).eq("id", z.id); load(); }} className="text-xs px-2 py-1 rounded border border-border">{z.active ? "Disable" : "Enable"}</button>
                  <button onClick={async () => { if (confirm(`Delete ${z.name}?`)) { await supabase.from("zones").delete().eq("id", z.id); load(); } }} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
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
      </main>
    </div>
  );
}
