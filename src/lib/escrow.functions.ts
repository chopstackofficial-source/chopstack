import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Try to send a Paystack transfer for the order's vendor payout.
 * Returns { sent, reference?, reason? }. Never throws — caller decides what
 * to do with the result so escrow release isn't blocked by transfer issues.
 */
async function tryPayoutVendor(opts: {
  recipientCode: string | null;
  amountNaira: number;
  orderId: string;
}): Promise<{ sent: boolean; reference?: string; reason?: string }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { sent: false, reason: "no_secret" };
  if (!opts.recipientCode) return { sent: false, reason: "no_recipient" };
  try {
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(opts.amountNaira * 100),
        recipient: opts.recipientCode,
        reason: `ChopStack payout for order ${opts.orderId.slice(0, 8)}`,
      }),
    });
    const body = (await res.json()) as { status: boolean; message?: string; data?: { reference?: string } };
    if (!res.ok || !body.status) {
      return { sent: false, reason: body.message ?? `paystack_${res.status}` };
    }
    return { sent: true, reference: body.data?.reference };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

/** Buyer or admin releases held escrow to vendor. */
export const releaseEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, buyer_id, farmer_id, escrow_status, vendor_payout_amount, vendor_payout_status, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    // Only the buyer (or admin via service role) can release through this fn
    if (order.buyer_id !== userId) throw new Error("Only the buyer can release this payment");
    if (order.payment_status !== "paid") throw new Error("Order is not paid");
    if (order.escrow_status === "released") return { ok: true, alreadyReleased: true };
    if (order.escrow_status === "frozen") throw new Error("Funds are frozen pending dispute resolution");
    if (order.escrow_status !== "held") throw new Error("No funds held for this order");

    // Look up vendor's payout recipient (admin client to read other user's bank field safely)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vendor } = await supabaseAdmin
      .from("users")
      .select("paystack_recipient_code")
      .eq("id", order.farmer_id)
      .maybeSingle();

    const payout = await tryPayoutVendor({
      recipientCode: vendor?.paystack_recipient_code ?? null,
      amountNaira: Number(order.vendor_payout_amount ?? 0),
      orderId: order.id,
    });

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        escrow_status: "released",
        status: "completed",
        released_at: nowIso,
        buyer_confirmed_at: nowIso,
        vendor_payout_status: payout.sent ? "sent" : "pending",
        payout_reference: payout.reference ?? null,
      })
      .eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    // Notify vendor
    await supabaseAdmin.from("notifications").insert({
      user_id: order.farmer_id,
      title: payout.sent ? "Payment released" : "Order completed — payout pending",
      body: payout.sent
        ? "The buyer confirmed delivery. Your payout is on the way."
        : "The buyer confirmed delivery. Add your bank details to receive payout.",
      type: "order",
      reference_id: order.id,
    });

    return { ok: true, payoutSent: payout.sent, payoutReason: payout.reason };
  });

/** Buyer opens a dispute — freezes escrow. */
export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, farmer_id, escrow_status, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.buyer_id !== userId) throw new Error("Only the buyer can open a dispute");
    if (order.payment_status !== "paid") throw new Error("No payment to dispute");
    if (order.escrow_status === "released" || order.escrow_status === "refunded") {
      throw new Error("Funds already settled");
    }

    const { error: updErr } = await supabase
      .from("orders")
      .update({ escrow_status: "frozen" })
      .eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    const { error: dErr } = await supabase
      .from("disputes")
      .insert({ order_id: order.id, opened_by: userId, reason: data.reason });
    if (dErr) throw new Error(dErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: order.farmer_id,
      title: "Dispute opened",
      body: "The buyer reported a problem. Funds are frozen until resolved.",
      type: "order",
      reference_id: order.id,
    });
    return { ok: true };
  });