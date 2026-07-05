import { createFileRoute } from "@tanstack/react-router";

// Called by pg_cron every 15 minutes. Flips escrow_status from 'held' to
// 'released' for delivered orders whose 4h window has elapsed. Auth via the
// Supabase publishable key (apikey header).
export const Route = createFileRoute("/api/public/hooks/escrow-release")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? "";
        if (!anon || provided !== anon) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        const { data: due, error } = await supabaseAdmin
          .from("orders")
          .select("id,vendor_id,order_number")
          .eq("payment_status", "paid")
          .eq("escrow_status", "held")
          .eq("delivery_status", "delivered")
          .lte("escrow_release_at", now);
        if (error) return new Response(error.message, { status: 500 });

        let released = 0;
        for (const o of due ?? []) {
          const { data, error: uErr } = await supabaseAdmin
            .from("orders")
            .update({ escrow_status: "released" })
            .eq("id", o.id)
            .eq("escrow_status", "held")
            .select("id");
          if (uErr || !data?.length) continue;
          released += 1;
          await supabaseAdmin.from("notifications").insert({
            user_id: o.vendor_id,
            user_type: "vendor",
            title: `Escrow released for ${o.order_number}`,
            body: "Funds released to your account.",
            deeplink: "/vendor",
          });
        }

        return new Response(JSON.stringify({ released }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});