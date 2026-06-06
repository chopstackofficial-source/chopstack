import { supabase } from "@/integrations/supabase/client";

export type CartRow = {
  id: string;
  listing_id: string;
  qty: number;
  listing: {
    id: string;
    title: string;
    price: number;
    unit: string | null;
    image_url: string | null;
    farmer_id: string;
    quantity_available: number | null;
    available_today: boolean | null;
  } | null;
};

export async function fetchCart(userId: string): Promise<CartRow[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id, listing_id, qty, listing:listings(id, title, price, unit, image_url, farmer_id, quantity_available, available_today)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CartRow[];
}

export async function addToCart(userId: string, listingId: string, qty = 1) {
  // upsert by unique (user_id, listing_id)
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, qty")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ qty: existing.qty + qty })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: userId, listing_id: listingId, qty });
    if (error) throw new Error(error.message);
  }
}

export async function updateCartQty(itemId: string, qty: number) {
  if (qty <= 0) {
    await supabase.from("cart_items").delete().eq("id", itemId);
    return;
  }
  const { error } = await supabase.from("cart_items").update({ qty }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function removeCartItem(itemId: string) {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function clearCart(userId: string) {
  await supabase.from("cart_items").delete().eq("user_id", userId);
}