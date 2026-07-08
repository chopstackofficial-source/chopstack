import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { haversineKm, maxRadiusKm, type Tier } from "@/lib/distance";

const Input = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
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

    // Load tiers to know max delivery radius
    const { data: tiersRaw } = await supabase.from("delivery_tiers").select("id,min_km,max_km,delivery_fee");
    const maxKm = maxRadiusKm(((tiersRaw ?? []) as unknown as Tier[]));
    if (maxKm === 0) return { matches: [], message: "Delivery not configured." };

    const { data: products } = await supabase
      .from("products")
      .select("id,name,price,quantity,is_farm_product,vendor:vendors(name,status,latitude,longitude)")
      .eq("is_sold_out", false)
      .gt("quantity", 0);

    type PRow = { id: string; name: string; price: number; quantity: number; is_farm_product: boolean; vendor: { name: string; status: string; latitude: number | null; longitude: number | null } | null };
    const stock = ((products ?? []) as unknown as PRow[]).filter((p) => {
      if (p.is_farm_product) return true;
      const v = p.vendor;
      if (!v || v.status !== "active") return false;
      if (v.latitude == null || v.longitude == null) return false;
      const km = haversineKm({ lat: data.lat, lng: data.lng }, { lat: v.latitude, lng: v.longitude });
      return km <= maxKm;
    });
    if (stock.length === 0) return { matches: [], message: "Nothing in stock right now." };

    const catalog = stock.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), vendor: p.is_farm_product ? "Farm" : p.vendor?.name }));

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