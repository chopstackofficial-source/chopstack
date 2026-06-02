import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requireAuthOrRedirect } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { openPaystack, newPaystackRef } from "@/lib/paystack";
import { verifyPaystackPayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/listings/$id")({ component: ListingDetail });

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [listing, setListing] = useState<any | null>(null);
  const [farmer, setFarmer] = useState<any | null>(null);
  const [split, setSplit] = useState<any | null>(null);
  const [mode, setMode] = useState<"none" | "solo" | "split">("none");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<"delivery" | "meetup">("meetup");
  const [payment, setPayment] = useState<"on_delivery" | "paystack">("on_delivery");
  const verifyPayment = useServerFn(verifyPaystackPayment);

  const load = async () => {
    const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    setListing(data);
    if (data) {
      supabase.from("users").select("full_name, location").eq("id", data.farmer_id).maybeSingle().then((r) => setFarmer(r.data));
      if (data.split_enabled) {
        supabase.from("splits").select("*").eq("listing_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle().then((r) => setSplit(r.data));
      }
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!split) return;
    const ch = supabase.channel(`split-${split.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "splits", filter: `id=eq.${split.id}` }, (p) => setSplit(p.new))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [split?.id]);

  const buySolo = async () => {
    if (!requireAuthOrRedirect(user, navigate)) return;
    if (!user || !profile) return;
    if (profile.account_type !== "buyer") return toast.error("Only buyers can order");
    if (listing.farmer_id === user.id) return toast.error("You cannot order your own listing");
    if (qty < 1 || qty > listing.quantity_available) return toast.error("Invalid quantity");
    setBusy(true);
    const total = Number(listing.price) * qty;
    const payMethod =
      payment === "paystack"
        ? "paystack"
        : delivery === "delivery"
          ? "cod"
          : "cash_at_meetup";
    const { data, error } = await supabase.from("orders").insert({
      listing_id: listing.id, buyer_id: user.id, farmer_id: listing.farmer_id,
      order_type: "solo", quantity: qty, total_price: total,
      delivery_method: delivery,
      payment_method: payMethod,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }

    if (payment === "paystack") {
      try {
        const reference = newPaystackRef();
        const result = await openPaystack({
          email: user.email ?? `${user.id}@chopstack.app`,
          amountNaira: total,
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
      toast.success("Order placed!");
    }

    await supabase.from("notifications").insert({
      user_id: listing.farmer_id,
      title: payment === "paystack" ? "New paid order" : "New order",
      body: `${profile.full_name} ordered ${qty} ${listing.unit} of ${listing.title}`,
      type: "order",
      reference_id: data.id,
    });
    setBusy(false);
    navigate({ to: "/orders/$id", params: { id: data.id } });
  };

  const joinSplit = async () => {
    if (!requireAuthOrRedirect(user, navigate)) return;
    if (!user || !profile) return;
    if (profile.account_type !== "buyer") return toast.error("Only buyers can join splits");
    if (listing.farmer_id === user.id) return toast.error("You cannot join your own split");
    if (!split || split.filled_slots >= split.total_slots) return toast.error("Split is full");
    setBusy(true);
    const slotPrice = Number(listing.price) * listing.quantity_available / split.total_slots;
    const { data: order, error } = await supabase.from("orders").insert({
      listing_id: listing.id, buyer_id: user.id, farmer_id: listing.farmer_id,
      order_type: "split", split_id: split.id, quantity: 1, total_price: slotPrice,
      delivery_method: "meetup",
      payment_method: "cash_at_meetup",
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("split_participants").insert({ split_id: split.id, buyer_id: user.id, order_id: order.id });
    await supabase.from("splits").update({ filled_slots: split.filled_slots + 1 }).eq("id", split.id);
    await supabase.from("notifications").insert({
      user_id: listing.farmer_id, title: "Split joined", body: `${profile.full_name} joined the split for ${listing.title}`, type: "split", reference_id: order.id,
    });
    setBusy(false);
    toast.success("Joined split!");
    navigate({ to: "/orders/$id", params: { id: order.id } });
  };

  if (!listing) return <div className="p-6 text-muted-foreground">Loading...</div>;
  const splitFull = split && split.filled_slots >= split.total_slots;

  return (
    <div className="min-h-screen bg-background pb-32 max-w-md mx-auto">
      <button onClick={() => history.back()} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
      {listing.images?.length ? (
        <div className="w-full h-72 overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
          {listing.images.map((src: string, i: number) => (
            <img key={i} src={src} className="w-full h-72 object-cover flex-shrink-0 snap-center" alt={listing.title} />
          ))}
        </div>
      ) : (
        <div className="w-full h-72 bg-secondary" />
      )}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="text-3xl font-black text-primary mt-2">{formatPrice(Number(listing.price))}<span className="text-base text-muted-foreground font-normal">/{listing.unit}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{listing.quantity_available} {listing.unit} available</p>
        </div>
        {listing.description && <p className="text-muted-foreground text-sm">{listing.description}</p>}
        {farmer && (
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Farmer</p>
            <p className="font-semibold">{farmer.full_name}</p>
            {listing.pickup_location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{listing.pickup_location}</p>}
          </div>
        )}
        {split && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-primary" /><span className="font-semibold text-sm">Split available</span></div>
            <p className="text-sm">{split.filled_slots}/{split.total_slots} slots filled</p>
            {splitFull && <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Split Full</span>}
          </div>
        )}
        {mode !== "none" && (
          <div className="bg-card border border-primary rounded-xl p-4 space-y-3">
            {mode === "solo" ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium">Quantity ({listing.unit})</span>
                  <Input type="number" min={1} max={listing.quantity_available} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="mt-1" />
                </label>
                <div>
                  <Label className="text-sm font-medium">How do you want it?</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button type="button" onClick={() => setDelivery("meetup")} className={`p-2 rounded-lg border text-sm ${delivery === "meetup" ? "border-primary bg-primary/10" : "border-border"}`}>Meetup at pickup</button>
                    <button type="button" onClick={() => setDelivery("delivery")} className={`p-2 rounded-lg border text-sm ${delivery === "delivery" ? "border-primary bg-primary/10" : "border-border"}`}>Delivery to me</button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button type="button" onClick={() => setPayment("on_delivery")} className={`p-2 rounded-lg border text-sm ${payment === "on_delivery" ? "border-primary bg-primary/10" : "border-border"}`}>{delivery === "delivery" ? "Pay on delivery" : "Pay at meetup"}</button>
                    <button type="button" onClick={() => setPayment("paystack")} className={`p-2 rounded-lg border text-sm ${payment === "paystack" ? "border-primary bg-primary/10" : "border-border"}`}>Pay now (card)</button>
                  </div>
                </div>
                <p className="text-sm">Total: <span className="font-bold text-primary">{formatPrice(Number(listing.price) * qty)}</span></p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMode("none")}>Cancel</Button>
                  <Button className="flex-1" onClick={buySolo} disabled={busy}>{busy ? "..." : payment === "paystack" ? "Pay & Order" : "Confirm Order"}</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">Join this split? You'll get 1 of {split?.total_slots} slots.</p>
                <p className="text-sm">Your share: <span className="font-bold text-primary">{formatPrice(Number(listing.price) * listing.quantity_available / (split?.total_slots || 1))}</span></p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMode("none")}>Cancel</Button>
                  <Button className="flex-1" onClick={joinSplit} disabled={busy}>{busy ? "..." : "Join Split"}</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {mode === "none" && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t border-border max-w-md mx-auto flex gap-2">
          <Button size="lg" className="flex-1" onClick={() => setMode("solo")}>Buy Solo</Button>
          {split && !splitFull && <Button size="lg" variant="outline" className="flex-1 border-primary text-primary" onClick={() => setMode("split")}>Join Split</Button>}
        </div>
      )}
    </div>
  );
}