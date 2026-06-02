import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requireAuthOrRedirect } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Package2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { openPaystack, newPaystackRef } from "@/lib/paystack";
import { verifyPaystackPayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/bundles/$id")({ component: BundleDetail });

function BundleDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [bundle, setBundle] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [farmer, setFarmer] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<"delivery" | "meetup">("meetup");
  const [payment, setPayment] = useState<"on_delivery" | "paystack">("on_delivery");
  const verifyPayment = useServerFn(verifyPaystackPayment);

  useEffect(() => {
    supabase.from("bundles").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setBundle(data);
      if (data) supabase.from("users").select("full_name, location").eq("id", data.farmer_id).maybeSingle().then((r) => setFarmer(r.data));
    });
    supabase.from("bundle_items").select("*").eq("bundle_id", id).then(({ data }) => setItems(data ?? []));
  }, [id]);

  const order = async () => {
    if (!requireAuthOrRedirect(user, navigate)) return;
    if (!user || !profile) return;
    if (profile.account_type !== "buyer") return toast.error("Only buyers can order");
    if (bundle.farmer_id === user.id) return toast.error("You cannot order your own bundle");
    setBusy(true);
    const payMethod =
      payment === "paystack"
        ? "paystack"
        : delivery === "delivery"
          ? "cod"
          : "cash_at_meetup";
    const { data, error } = await supabase.from("orders").insert({
      bundle_id: bundle.id,
      buyer_id: user.id,
      farmer_id: bundle.farmer_id,
      order_type: "bundle",
      quantity: 1,
      total_price: bundle.price,
      delivery_method: delivery,
      payment_method: payMethod,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }

    if (payment === "paystack") {
      try {
        const reference = newPaystackRef();
        const result = await openPaystack({
          email: user.email ?? `${user.id}@chopstack.app`,
          amountNaira: Number(bundle.price),
          reference,
          metadata: { order_id: data.id },
        });
        await verifyPayment({ data: { reference: result.reference, orderId: data.id } });
        toast.success("Payment received!");
      } catch (e: any) {
        setBusy(false);
        toast.error(e?.message ?? "Payment failed — order saved as unpaid");
        navigate({ to: "/orders/$id", params: { id: data.id } });
        return;
      }
    } else {
      toast.success("Bundle ordered!");
    }

    await supabase.from("notifications").insert({
      user_id: bundle.farmer_id,
      title: payment === "paystack" ? "New paid bundle order" : "New bundle order",
      body: `${profile.full_name} ordered ${bundle.title}`,
      type: "bundle",
      reference_id: data.id,
    });
    setBusy(false);
    navigate({ to: "/orders/$id", params: { id: data.id } });
  };

  if (!bundle) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-32 max-w-md mx-auto">
      <button onClick={() => history.back()} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
      {bundle.cover_image ? (
        <img src={bundle.cover_image} className="w-full h-64 object-cover" alt={bundle.title} />
      ) : (
        <div className="w-full h-64 bg-secondary flex items-center justify-center"><Package2 className="w-16 h-16 text-primary" /></div>
      )}
      <div className="p-4 space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-primary font-bold">For {bundle.target_audience}</span>
          <h1 className="text-2xl font-bold mt-1">{bundle.title}</h1>
          <p className="text-3xl font-black text-primary mt-2">{formatPrice(Number(bundle.price))}</p>
        </div>
        {bundle.description && <p className="text-muted-foreground text-sm">{bundle.description}</p>}
        <div>
          <h3 className="font-semibold mb-2">What's included ({items.length})</h3>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between p-3 text-sm">
                <span>{it.item_name}</span>
                <span className="text-primary font-medium">{it.quantity}</span>
              </div>
            ))}
          </div>
        </div>
        {farmer && (
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Vendor</p>
            <p className="font-semibold">{farmer.full_name}</p>
            {farmer.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{farmer.location}</p>}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t border-border max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button type="button" onClick={() => setDelivery("meetup")} className={`p-2 rounded-lg border text-sm ${delivery === "meetup" ? "border-primary bg-primary/10" : "border-border"}`}>Meetup</button>
          <button type="button" onClick={() => setDelivery("delivery")} className={`p-2 rounded-lg border text-sm ${delivery === "delivery" ? "border-primary bg-primary/10" : "border-border"}`}>Delivery</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button type="button" onClick={() => setPayment("on_delivery")} className={`p-2 rounded-lg border text-sm ${payment === "on_delivery" ? "border-primary bg-primary/10" : "border-border"}`}>{delivery === "delivery" ? "Pay on delivery" : "Pay at meetup"}</button>
          <button type="button" onClick={() => setPayment("paystack")} className={`p-2 rounded-lg border text-sm ${payment === "paystack" ? "border-primary bg-primary/10" : "border-border"}`}>Pay now (card)</button>
        </div>
        <Button size="lg" className="w-full shadow-[var(--glow-primary)]" onClick={order} disabled={busy}>{busy ? "Ordering..." : `${payment === "paystack" ? "Pay & Order" : "Order Bundle"} • ${formatPrice(Number(bundle.price))}`}</Button>
      </div>
    </div>
  );
}