import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InitInput = z.object({
  zoneId: z.string().uuid(),
  callbackUrl: z.string().url(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(100),
      }),
    )
    .min(1),
});

type InitResult = { authorization_url: string; reference: string };

export const initPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InitInput.parse(input))
  .handler(async ({ data, context }): Promise<InitResult> => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");
    const { supabase, userId } = context;

    // Load buyer profile (for email)
    const { data: buyer, error: buyerErr } = await supabase
      .from("buyers")
      .select("email,name")
      .eq("id", userId)
      .maybeSingle();
    if (buyerErr || !buyer) throw new Error("Complete your buyer profile first");

    // Load zone
    const { data: zone, error: zoneErr } = await supabase
      .from("zones")
      .select("id,name,delivery_fee")
      .eq("id", data.zoneId)
      .maybeSingle();
    if (zoneErr || !zone) throw new Error("Invalid delivery zone");

    // Load products with fresh prices/vendor + subaccount
    const productIds = data.items.map((i) => i.productId);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id,name,price,quantity,vendor_id,is_sold_out,vendor:vendors(id,paystack_subaccount_code,status)")
      .in("id", productIds);
    if (pErr) throw new Error(pErr.message);
    if (!products || products.length !== productIds.length) throw new Error("Some items are no longer available");

    // Validate stock + build vendor groups
    type Row = { productId: string; name: string; price: number; qty: number; vendorId: string; subaccount: string | null };
    const rows: Row[] = [];
    for (const item of data.items) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) throw new Error("Item unavailable");
      if (p.is_sold_out || p.quantity < item.qty) throw new Error(`${p.name} is out of stock`);
      const v = p.vendor as { id: string; paystack_subaccount_code: string | null; status: string } | null;
      if (!v || v.status !== "active") throw new Error(`${p.name} vendor is not active`);
      rows.push({
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        qty: item.qty,
        vendorId: v.id,
        subaccount: v.paystack_subaccount_code,
      });
    }

    const grouped = rows.reduce<Record<string, Row[]>>((a, r) => {
      (a[r.vendorId] ||= []).push(r);
      return a;
    }, {});
    const vendorIds = Object.keys(grouped);
    const subtotal = rows.reduce((s, r) => s + r.price * r.qty, 0);
    const deliveryFeeTotal = Number(zone.delivery_fee);
    const total = subtotal + deliveryFeeTotal;

    // Create one order per vendor, shared payment reference
    const reference = `CS-${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
    const orderIds: string[] = [];
    try {
      for (const vid of vendorIds) {
        const group = grouped[vid];
        const sub = group.reduce((s, r) => s + r.price * r.qty, 0);
        const df = Math.round((deliveryFeeTotal / vendorIds.length) * 100) / 100;
        const { data: order, error } = await supabase
          .from("orders")
          .insert({
            buyer_id: userId,
            vendor_id: vid,
            zone_id: zone.id,
            subtotal: sub,
            delivery_fee: df,
            total: sub + df,
            payment_status: "unpaid",
            escrow_status: "none",
            delivery_status: "confirmed",
            payment_reference: reference,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        orderIds.push(order.id);
        const items = group.map((r) => ({
          order_id: order.id,
          product_id: r.productId,
          name_snapshot: r.name,
          unit_price: r.price,
          quantity: r.qty,
        }));
        const { error: oiErr } = await supabase.from("order_items").insert(items);
        if (oiErr) throw new Error(oiErr.message);
      }
    } catch (e) {
      // Best-effort cleanup
      if (orderIds.length) await supabase.from("orders").delete().in("id", orderIds);
      throw e;
    }

    // Build split — only include vendors with a subaccount. If none have one,
    // fall back to a plain transaction and settle payouts manually.
    const subaccountShares = vendorIds
      .map((vid) => {
        const g = grouped[vid];
        const sub = g.reduce((s, r) => s + r.price * r.qty, 0);
        const sa = g[0].subaccount;
        return sa ? { subaccount: sa, share: Math.round(sub * 100) } : null;
      })
      .filter((x): x is { subaccount: string; share: number } => !!x);

    const payload: Record<string, unknown> = {
      email: buyer.email,
      amount: Math.round(total * 100),
      reference,
      callback_url: data.callbackUrl,
      metadata: {
        order_ids: orderIds,
        buyer_id: userId,
        zone_id: zone.id,
      },
    };
    if (subaccountShares.length > 0) {
      payload.split = {
        type: "flat",
        bearer_type: "account",
        currency: "NGN",
        subaccounts: subaccountShares,
      };
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url: string; reference: string };
    };
    if (!res.ok || !json.status || !json.data) {
      await supabase.from("orders").delete().in("id", orderIds);
      throw new Error(json.message || "Payment init failed");
    }
    return { authorization_url: json.data.authorization_url, reference: json.data.reference };
  });

const VerifyInput = z.object({ reference: z.string().min(4).max(64) });

type VerifyResult = { paid: boolean; orderIds: string[] };

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json()) as {
      status?: boolean;
      data?: { status: string; reference: string };
    };
    if (!res.ok || !json.status || !json.data) throw new Error("Verify failed");
    const paid = json.data.status === "success";

    const { data: orders } = await context.supabase
      .from("orders")
      .select("id,buyer_id,payment_status")
      .eq("payment_reference", data.reference);
    const owned = (orders ?? []).filter((o) => o.buyer_id === context.userId);
    if (owned.length === 0) return { paid, orderIds: [] };

    if (paid) {
      // Idempotent flip — webhook may have beat us to it.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc; // no-op reference to keep bundler happy
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          escrow_status: "held",
          paid_at: new Date().toISOString(),
        })
        .eq("payment_reference", data.reference)
        .eq("payment_status", "unpaid");
    }
    return { paid, orderIds: owned.map((o) => o.id) };
  });