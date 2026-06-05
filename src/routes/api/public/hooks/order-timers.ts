import { createFileRoute } from "@tanstack/react-router";

/**
 * Periodic order timers (called by pg_cron every 5 min).
 * - pending > 2h           → auto-cancel + refund (if paid)
 * - meetup_at + 6h passed  → auto-release escrow (buyer didn't confirm)
 * - accepted > 48h         → auto-complete (if still active)
 */
export const Route = createFileRoute("/api/public/hooks/order-timers")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const TWO_H_AGO = new Date(Date.now() - 2 * 3600_000).toISOString();
        const SIX_H_AGO = new Date(Date.now() - 6 * 3600_000).toISOString();
        const FORTY_EIGHT_H_AGO = new Date(Date.now() - 48 * 3600_000).toISOString();
        const result = { cancelled: 0, released: 0, completed: 0, errors: [] as string[] };

        // -------- 1. Auto-cancel pending > 2h --------
        const { data: stalePending } = await supabaseAdmin
          .from("orders")
          .select("id, buyer_id, farmer_id, payment_status, payment_reference, escrow_status, total_price")
          .eq("status", "pending")
          .lt("created_at", TWO_H_AGO)
          .limit(100);

        for (const o of stalePending ?? []) {
          try {
            let refunded = false;
            if (o.payment_status === "paid" && o.payment_reference && process.env.PAYSTACK_SECRET_KEY) {
              const res = await fetch("https://api.paystack.co/refund", {
                method: "POST",
                headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ transaction: o.payment_reference }),
              });
              const body = (await res.json()) as { status: boolean; message?: string };
              if (res.ok && body.status) refunded = true;
              else result.errors.push(`refund ${o.id}: ${body.message ?? res.status}`);
            }
            await supabaseAdmin
              .from("orders")
              .update({
                status: "cancelled",
                cancelled_by: null,
                payment_status: refunded ? "refunded" : o.payment_status,
                escrow_status: refunded ? "refunded" : (o.escrow_status === "held" ? "refunded" : o.escrow_status),
              })
              .eq("id", o.id);
            await supabaseAdmin.from("notifications").insert([
              { user_id: o.buyer_id, title: "Order auto-cancelled", body: refunded ? "Vendor didn't respond in 2 hours — you've been refunded." : "Vendor didn't respond in 2 hours.", type: "order", reference_id: o.id },
              { user_id: o.farmer_id, title: "Order auto-cancelled", body: "You didn't accept within 2 hours.", type: "order", reference_id: o.id },
            ]);
            result.cancelled++;
          } catch (e) {
            result.errors.push(`cancel ${o.id}: ${(e as Error).message}`);
          }
        }

        // -------- 2. Auto-release if meetup_at + 6h passed and still held --------
        const { data: postMeetup } = await supabaseAdmin
          .from("orders")
          .select("id, buyer_id, farmer_id, escrow_status, vendor_payout_amount")
          .eq("escrow_status", "held")
          .in("status", ["accepted", "meetup_scheduled"])
          .not("meetup_at", "is", null)
          .lt("meetup_at", SIX_H_AGO)
          .limit(100);

        for (const o of postMeetup ?? []) {
          try {
            await supabaseAdmin.from("orders").update({
              status: "completed",
              escrow_status: "released",
              released_at: nowIso,
              buyer_confirmed_at: nowIso,
              vendor_payout_status: "pending", // payout reconciled by release fn or manual admin
            }).eq("id", o.id);
            await supabaseAdmin.from("notifications").insert([
              { user_id: o.buyer_id, title: "Order auto-completed", body: "6 hours passed after meetup — funds released to vendor.", type: "order", reference_id: o.id },
              { user_id: o.farmer_id, title: "Payment released", body: "Auto-released 6h after meetup. Payout pending.", type: "order", reference_id: o.id },
            ]);
            result.released++;
          } catch (e) {
            result.errors.push(`release ${o.id}: ${(e as Error).message}`);
          }
        }

        // -------- 3. Auto-complete if accepted > 48h and not already settled --------
        const { data: stale } = await supabaseAdmin
          .from("orders")
          .select("id, buyer_id, farmer_id, escrow_status")
          .in("status", ["accepted", "meetup_scheduled"])
          .lt("accepted_at", FORTY_EIGHT_H_AGO)
          .limit(100);

        for (const o of stale ?? []) {
          try {
            const updates: Record<string, unknown> = { status: "completed", buyer_confirmed_at: nowIso };
            if (o.escrow_status === "held") {
              updates.escrow_status = "released";
              updates.released_at = nowIso;
              updates.vendor_payout_status = "pending";
            }
            await supabaseAdmin.from("orders").update(updates).eq("id", o.id);
            await supabaseAdmin.from("notifications").insert([
              { user_id: o.buyer_id, title: "Order auto-completed", body: "48 hours passed since acceptance.", type: "order", reference_id: o.id },
              { user_id: o.farmer_id, title: "Order auto-completed", body: "48 hours passed since you accepted.", type: "order", reference_id: o.id },
            ]);
            result.completed++;
          } catch (e) {
            result.errors.push(`complete ${o.id}: ${(e as Error).message}`);
          }
        }

        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});