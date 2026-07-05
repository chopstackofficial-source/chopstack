import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type PaystackEvent = {
  event: string;
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    metadata?: { order_ids?: string[] } | null;
  };
};

export const Route = createFileRoute("/api/public/hooks/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let evt: PaystackEvent;
        try {
          evt = JSON.parse(raw) as PaystackEvent;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip if we've already logged this event id.
        const eventId = `${evt.event}:${evt.data?.id ?? evt.data?.reference}`;
        const { error: logErr } = await supabaseAdmin
          .from("paystack_events")
          .insert({
            event_id: eventId,
            event_type: evt.event,
            reference: evt.data?.reference ?? null,
            payload: evt as unknown as never,
          });
        if (logErr && logErr.code === "23505") {
          return new Response("ok", { status: 200 });
        }

        if (evt.event === "charge.success" && evt.data?.status === "success") {
          const ref = evt.data.reference;
          const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("id,buyer_id,vendor_id,order_number,payment_status")
            .eq("payment_reference", ref);

          if (orders && orders.length > 0) {
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "paid",
                escrow_status: "held",
                paid_at: new Date().toISOString(),
              })
              .eq("payment_reference", ref)
              .eq("payment_status", "unpaid");

            // Decrement stock for order items (once per order).
            const orderIds = orders.map((o) => o.id);
            const { data: items } = await supabaseAdmin
              .from("order_items")
              .select("product_id,quantity")
              .in("order_id", orderIds);
            if (items) {
              for (const it of items) {
                if (!it.product_id) continue;
                const { data: p } = await supabaseAdmin
                  .from("products")
                  .select("quantity")
                  .eq("id", it.product_id)
                  .maybeSingle();
                if (p) {
                  const next = Math.max(0, Number(p.quantity) - Number(it.quantity));
                  await supabaseAdmin
                    .from("products")
                    .update({ quantity: next, is_sold_out: next === 0 })
                    .eq("id", it.product_id);
                }
              }
            }

            // Notifications
            const notes = orders.flatMap((o) => [
              {
                user_id: o.buyer_id,
                user_type: "buyer" as const,
                title: `Order ${o.order_number} confirmed`,
                body: "Payment received. Vendor is preparing your order.",
                deeplink: `/orders/${o.id}`,
              },
              {
                user_id: o.vendor_id,
                user_type: "vendor" as const,
                title: `New paid order ${o.order_number}`,
                body: "Check your vendor dashboard.",
                deeplink: `/vendor`,
              },
            ]);
            if (notes.length) await supabaseAdmin.from("notifications").insert(notes);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});