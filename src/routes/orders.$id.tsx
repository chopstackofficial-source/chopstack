import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CalendarClock, MapPin, Wallet, Truck, ShieldCheck, AlertTriangle, Star } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { releaseEscrow, openDispute } from "@/lib/escrow.functions";

export const Route = createFileRoute("/orders/$id")({ component: OrderDetail });

function OrderDetail() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any | null>(null);
  const [showMeetup, setShowMeetup] = useState(false);
  const [mLoc, setMLoc] = useState("");
  const [mAt, setMAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemText, setProblemText] = useState("");
  const [rating, setRating] = useState<{ stars: number; comment: string; submitted: boolean }>({ stars: 0, comment: "", submitted: false });
  const releaseFn = useServerFn(releaseEscrow);
  const disputeFn = useServerFn(openDispute);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (!o) { setOrder(null); return; }
    const [{ data: listing }, { data: bundle }, { data: people }] = await Promise.all([
      o.listing_id ? supabase.from("listings").select("*").eq("id", o.listing_id).maybeSingle() : Promise.resolve({ data: null }),
      o.bundle_id ? supabase.from("bundles").select("*").eq("id", o.bundle_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("users").select("id, full_name, phone").in("id", [o.buyer_id, o.farmer_id]),
    ]);
    const map = Object.fromEntries((people ?? []).map((u: any) => [u.id, u]));
    setOrder({ ...o, listings: listing, bundles: bundle, buyer: map[o.buyer_id], farmer: map[o.farmer_id] });
    // Check if buyer already rated the vendor on this order
    if (user?.id === o.buyer_id) {
      const { data: existing } = await supabase
        .from("ratings")
        .select("id")
        .eq("order_id", o.id)
        .eq("rater_id", user.id)
        .eq("role", "vendor")
        .maybeSingle();
      if (existing) setRating((r) => ({ ...r, submitted: true }));
    }
  };
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const isBuyer = user?.id === order.buyer_id;
    const title = order.listings?.title || order.bundles?.title;
    const { error } = await supabase.from("orders").update({ status: "cancelled", cancelled_by: user?.id }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: isBuyer ? order.farmer_id : order.buyer_id,
      title: "Order cancelled",
      body: `${profile?.full_name ?? "User"} cancelled the order for ${title}`,
      type: "order",
      reference_id: id,
    });
    toast.success("Order cancelled"); load();
  };

  const scheduleMeetup = async () => {
    if (!mLoc.trim() || !mAt) return toast.error("Add location and time");
    setBusy(true);
    const { error } = await supabase.from("orders").update({
      status: "meetup_scheduled",
      meetup_location: mLoc.trim(),
      meetup_at: new Date(mAt).toISOString(),
    }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: order.buyer_id,
      title: "Meetup scheduled",
      body: `${mLoc.trim()} on ${new Date(mAt).toLocaleString()}`,
      type: "order",
      reference_id: id,
    });
    toast.success("Meetup scheduled"); setShowMeetup(false); load();
  };

  if (!order) return <div className="p-6 text-muted-foreground">Loading...</div>;
  const title = order.listings?.title || order.bundles?.title || "Order";
  const isBuyer = user?.id === order.buyer_id;
  const canCancel = !["completed", "cancelled", "declined"].includes(order.status) && (isBuyer || user?.id === order.farmer_id);
  const escrowHeld = order.escrow_status === "held";
  const escrowFrozen = order.escrow_status === "frozen";
  const escrowReleased = order.escrow_status === "released";

  const confirmReceived = async () => {
    if (!confirm("Confirm you received this order? Funds will be released to the seller.")) return;
    setBusy(true);
    try {
      const r = await releaseFn({ data: { orderId: id } });
      toast.success(r.payoutSent ? "Order completed — vendor paid" : "Order completed");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not complete");
    } finally {
      setBusy(false);
    }
  };

  const submitProblem = async () => {
    if (problemText.trim().length < 3) return toast.error("Tell us what went wrong");
    setBusy(true);
    try {
      await disputeFn({ data: { orderId: id, reason: problemText.trim() } });
      toast.success("Dispute opened. Funds frozen until resolved.");
      setProblemOpen(false); setProblemText(""); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open dispute");
    } finally {
      setBusy(false);
    }
  };

  const submitRating = async () => {
    if (rating.stars < 1) return toast.error("Pick a star rating");
    const { error } = await supabase.from("ratings").insert({
      order_id: order.id,
      rater_id: user!.id,
      ratee_id: order.farmer_id,
      role: "vendor",
      stars: rating.stars,
      comment: rating.comment.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Thanks for your rating");
    setRating((r) => ({ ...r, submitted: true }));
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => history.back()}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold">Order Details</h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-primary/20 text-primary font-bold">{order.order_type}</span>
          <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-secondary">{String(order.status).replace("_", " ")}</span>
          <span className={`text-[10px] uppercase px-2 py-1 rounded-full font-bold ${order.payment_status === "paid" ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-600"}`}>{order.payment_status === "paid" ? "Paid" : "Unpaid"}</span>
        </div>
        {escrowHeld && (
          <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-3 flex items-start gap-2 text-sm">
            <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-600">Protected Payment</p>
              <p className="text-muted-foreground text-xs">Your money is held safely until you confirm delivery.</p>
            </div>
          </div>
        )}
        {escrowFrozen && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-600">Funds frozen</p>
              <p className="text-muted-foreground text-xs">A dispute is open. Our team will review and resolve it.</p>
            </div>
          </div>
        )}
        {escrowReleased && (
          <div className="bg-card border border-border rounded-xl p-3 text-sm">
            <p className="text-muted-foreground">Funds released to seller{order.released_at ? ` on ${formatDate(order.released_at)}` : ""}.</p>
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="font-bold text-lg">{title}</h2>
          {order.quantity && <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>}
          <p className="text-2xl font-black text-primary">{formatPrice(Number(order.total_price))}</p>
          <p className="text-xs text-muted-foreground">Placed {formatDate(order.created_at)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Fulfilment:</span> <span className="font-medium">{order.delivery_method === "delivery" ? "Delivery to buyer" : order.delivery_method === "meetup" ? "Meetup at pickup point" : "Not set"}</span></div>
          <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{order.payment_method === "cod" ? "Cash on delivery" : order.payment_method === "cash_at_meetup" ? "Cash at meetup" : order.payment_method === "paystack" ? "Paid online (Paystack)" : "Not set"}</span></div>
        </div>
        {(order.meetup_location || order.meetup_at) && (
          <div className="bg-primary/10 border border-primary/40 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex items-center gap-2 font-semibold text-primary"><CalendarClock className="w-4 h-4" /> Meetup details</div>
            {order.meetup_location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {order.meetup_location}</p>}
            {order.meetup_at && <p className="text-muted-foreground">{new Date(order.meetup_at).toLocaleString()}</p>}
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{isBuyer ? "Farmer" : "Buyer"}</p>
          <p className="font-semibold">{isBuyer ? order.farmer?.full_name : order.buyer?.full_name}</p>
        </div>
        {!isBuyer && order.status === "pending" && profile?.account_type === "farmer" && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={async () => {
              await supabase.from("orders").update({ status: "declined" }).eq("id", id);
              await supabase.from("notifications").insert({
                user_id: order.buyer_id,
                title: "Order declined",
                body: `${profile?.full_name ?? "The seller"} declined your order for ${title}`,
                type: "order",
                reference_id: id,
              });
              load(); toast.success("Declined");
            }}>Decline</Button>
            <Button className="flex-1" onClick={async () => { await supabase.from("orders").update({ status: "accepted" }).eq("id", id); await supabase.from("notifications").insert({ user_id: order.buyer_id, title: "Order accepted", body: title, type: "order", reference_id: order.id }); load(); toast.success("Accepted"); }}>Accept</Button>
          </div>
        )}
        {!isBuyer && (order.status === "accepted" || order.status === "meetup_scheduled") && (
          <>
            {!showMeetup ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowMeetup(true); setMLoc(order.meetup_location ?? ""); setMAt(order.meetup_at ? new Date(order.meetup_at).toISOString().slice(0,16) : ""); }}>
                  <CalendarClock className="w-4 h-4" /> {order.meetup_at ? "Update meetup" : "Schedule meetup"}
                </Button>
                <Button className="flex-1" onClick={async () => {
                  await supabase.from("orders").update({ status: "completed" }).eq("id", id);
                  await supabase.from("notifications").insert({
                    user_id: order.buyer_id,
                    title: "Order completed",
                    body: `${profile?.full_name ?? "The seller"} marked "${title}" as completed`,
                    type: "order",
                    reference_id: id,
                  });
                  load(); toast.success("Marked complete");
                }}>Mark complete</Button>
              </div>
            ) : (
              <div className="bg-card border border-primary rounded-xl p-4 space-y-3">
                <div>
                  <Label>Meetup location</Label>
                  <Input className="mt-1" placeholder="e.g. Ring Road junction" value={mLoc} onChange={(e) => setMLoc(e.target.value)} />
                </div>
                <div>
                  <Label>Date & time</Label>
                  <Input className="mt-1" type="datetime-local" value={mAt} onChange={(e) => setMAt(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowMeetup(false)}>Back</Button>
                  <Button className="flex-1" onClick={scheduleMeetup} disabled={busy}>{busy ? "..." : "Save & notify"}</Button>
                </div>
              </div>
            )}
          </>
        )}
        {isBuyer && (order.status === "accepted" || order.status === "meetup_scheduled") && (
          <>
            {escrowHeld ? (
              <div className="space-y-2">
                <Button className="w-full" onClick={confirmReceived} disabled={busy}>
                  <ShieldCheck className="w-4 h-4" /> I received my order
                </Button>
                {!problemOpen ? (
                  <Button variant="outline" className="w-full" onClick={() => setProblemOpen(true)}>
                    <AlertTriangle className="w-4 h-4" /> There's a problem
                  </Button>
                ) : (
                  <div className="bg-card border border-amber-500/40 rounded-xl p-4 space-y-3">
                    <div>
                      <Label>What went wrong?</Label>
                      <Textarea className="mt-1" rows={3} placeholder="Describe the issue" value={problemText} onChange={(e) => setProblemText(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setProblemOpen(false); setProblemText(""); }}>Back</Button>
                      <Button className="flex-1" onClick={submitProblem} disabled={busy}>{busy ? "..." : "Open dispute"}</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button className="w-full" onClick={async () => {
                if (!confirm("Mark this order as received and complete?")) return;
                const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", id);
                if (error) return toast.error(error.message);
                await supabase.from("notifications").insert({
                  user_id: order.farmer_id,
                  title: "Order completed",
                  body: `${profile?.full_name ?? "Buyer"} marked "${title}" as received`,
                  type: "order",
                  reference_id: id,
                });
                toast.success("Order completed"); load();
              }}>Mark as received</Button>
            )}
          </>
        )}
        {isBuyer && order.status === "completed" && !rating.submitted && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm">Rate the seller</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setRating((r) => ({ ...r, stars: n }))} aria-label={`${n} star${n>1?"s":""}`}>
                  <Star className={`w-7 h-7 ${n <= rating.stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea rows={2} placeholder="Optional comment" value={rating.comment} onChange={(e) => setRating((r) => ({ ...r, comment: e.target.value }))} />
            <Button className="w-full" onClick={submitRating} disabled={rating.stars < 1}>Submit rating</Button>
          </div>
        )}
        {isBuyer && order.status === "completed" && rating.submitted && (
          <div className="bg-card border border-border rounded-xl p-3 text-center text-sm text-muted-foreground">
            Thanks for rating this seller.
          </div>
        )}
        {canCancel && (
          <Button variant="outline" className="w-full text-destructive border-destructive" onClick={cancel}>Cancel order</Button>
        )}
      </div>
    </div>
  );
}