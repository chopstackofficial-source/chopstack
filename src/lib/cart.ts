// LocalStorage cart. Guest and signed-in users share the same store.
// On checkout, cart is converted into orders per vendor.
const KEY = "cs_cart_v1";

export type CartLine = { productId: string; qty: number };

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeCart(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function emit() { listeners.forEach((l) => l()); }

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function writeCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  emit();
}
export function addToCart(productId: string, qty = 1) {
  const c = readCart();
  const i = c.findIndex((l) => l.productId === productId);
  if (i >= 0) c[i].qty += qty; else c.push({ productId, qty });
  writeCart(c);
}
export function setQty(productId: string, qty: number) {
  const c = readCart();
  const i = c.findIndex((l) => l.productId === productId);
  if (i < 0) return;
  if (qty <= 0) c.splice(i, 1); else c[i].qty = qty;
  writeCart(c);
}
export function removeFromCart(productId: string) { setQty(productId, 0); }
export function clearCart() { writeCart([]); }
export function cartCount() { return readCart().reduce((s, l) => s + l.qty, 0); }
