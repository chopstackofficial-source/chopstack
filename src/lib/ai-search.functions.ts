import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const Input = z.object({
  zoneId: z.string().uuid(),
  query: z.string().min(1).max(100),
});

type Match = { productId: string; reason: string };
type AiResult = { matches: Match[]; message: string };

export const aiSearchProducts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AiResult> => {
    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(url, anon, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    // Get in-stock products in the buyer's zone
    const { data: pz } = await supabase.from("product_zones").select("product_id").eq("zone_id", data.zoneId);
    const ids = (pz ?? []).map((r) => r.product_id);
    if (ids.length === 0) return { matches: [], message: "Nothing in stock in this zone yet." };

    const { data: products } = await supabase
      .from("products")
      .select("id,name,price,quantity,vendor:vendors(name,status)")
      .in("id", ids)
      .eq("is_sold_out", false)
      .gt("quantity", 0);

    const stock = (products ?? []).filter((p) => (p.vendor as { status: string } | null)?.status === "active");
    if (stock.length === 0) return { matches: [], message: "Nothing in stock right now." };

    const catalog = stock.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), vendor: (p.vendor as { name: string } | null)?.name }));

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You match a Nigerian grocery buyer's request to items in a live stock list.
Return JSON only: {"matches":[{"productId":"...","reason":"..."}],"message":"one short line, e.g. Found 3 matches or Nothing matches, try X"}.
Return up to 6 matches ordered by relevance. If nothing matches exactly, suggest the closest 1-2 alternatives and say so in message. Never invent product IDs.`;

    const userPrompt = `Buyer asked: "${data.query}"\n\nStock (JSON):\n${JSON.stringify(catalog)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return { matches: [], message: "Too many requests, try again in a moment." };
      if (res.status === 402) return { matches: [], message: "AI temporarily unavailable." };
      return { matches: [], message: "Search failed, try scrolling the feed." };
    }

    const body = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = body.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(raw) as AiResult;
      const validIds = new Set(catalog.map((c) => c.id));
      const matches = (parsed.matches ?? []).filter((m) => validIds.has(m.productId)).slice(0, 6);
      return { matches, message: parsed.message ?? (matches.length ? `Found ${matches.length}` : "Nothing matched.") };
    } catch {
      return { matches: [], message: "Couldn't parse suggestions." };
    }
  });