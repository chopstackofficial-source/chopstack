import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Verify a Paystack transaction server-side and mark the order as paid.
 * Only the buyer who owns the order may call this.
 */
export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reference: z.string().min(4).max(128),
        orderId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment provider not configured");

    // Fetch order via user-scoped client (RLS ensures buyer owns it)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, buyer_id, total_price, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Order not found");
    if (order.buyer_id !== userId) throw new Error("Not your order");
    if (order.payment_status === "paid") {
      return { ok: true, alreadyPaid: true };
    }

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    if (!res.ok) {
      throw new Error(`Verification failed (${res.status})`);
    }
    const body = (await res.json()) as {
      status: boolean;
      data?: { status: string; amount: number; currency: string };
    };
    if (!body.status || !body.data || body.data.status !== "success") {
      throw new Error("Payment not successful");
    }
    // amount in kobo; compare to expected
    const expectedKobo = Math.round(Number(order.total_price) * 100);
    if (body.data.amount < expectedKobo) {
      throw new Error("Paid amount does not match order total");
    }
    if (body.data.currency !== "NGN") {
      throw new Error("Unexpected currency");
    }

    // Compute 4% platform commission and vendor payout share, hold in escrow
    const total = Number(order.total_price);
    const commission = Math.round(total * 0.04 * 100) / 100;
    const vendorShare = Math.round((total - commission) * 100) / 100;

    const { error: updErr } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_reference: data.reference,
        paid_at: new Date().toISOString(),
        escrow_status: "held",
        commission_amount: commission,
        vendor_payout_amount: vendorShare,
      })
      .eq("id", data.orderId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, alreadyPaid: false };
  });