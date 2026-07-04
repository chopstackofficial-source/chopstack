# Chopstack — Final Spec Alignment

Most of the schema and buyer flow already exists from Phase 1. This plan reshapes what's built to match the finalised spec, then adds the missing pieces (AI chat, vendor storefronts, Paystack split, 4-hour escrow, push notifications).

## 1. Schema adjustments (single migration)

- `vendors`: drop approval gating. Default `status = 'active'`. Keep `suspended` for admin. Remove `pending`/`rejection_reason` gating from all reads.
- `buyers`: add `delivery_address text not null` (asked once at signup).
- `orders`:
  - Replace 5-digit numeric `order_number` with `CS-XXXXX` (6 alphanumeric, uppercase, unique). New default via `gen_order_number()` retrying on collision.
  - `escrow_release_at` = `delivered_at + interval '4 hours'` (was 24h).
  - `delivery_status` enum: `confirmed | on_the_way | delivered` (drop `packed`, `pending`, `cancelled` for the buyer-visible flow — vendor cancel becomes a dispute/refund path).
- Drop unused `product_zones` insert paths that referenced approval.
- Confirm RLS: vendor storefronts publicly readable (approved-vendor filter → active-vendor filter).

## 2. Buyer flow changes

- **Signup**: add `delivery_address` field (textarea, required). Save to `buyers`.
- **Home**:
  - Add AI chat bar at top with placeholder "What need?". Powered by Gemini Flash via `createServerFn` calling Lovable AI Gateway (`google/gemini-3-flash-preview`).
  - System prompt receives the live in-zone stock list; returns matched product IDs + optional alternative. Renders result cards inline above the feed.
  - Session rate-limit: 10 queries / session (localStorage counter). Input capped at 100 chars.
  - Live feed unchanged below.
- **Vendor storefront**: new route `/vendor/$id` — public page with vendor name, photo (add `photo_url` col on `vendors`), zone tags, active products.
- **Checkout**: single Paystack call with split. Server fn `initCheckout` builds subaccount split from vendors' saved Paystack subaccount code. `verifyPayment` marks orders paid + escrow held.
- **Order number** shown as `CS-XXXXX` everywhere.

## 3. Vendor flow changes

- **Signup**: no more "pending" screen. On submit, insert vendor row (`status=active`) and go straight to `/vendor` dashboard. Delete `vendor.pending.tsx`.
- **Product form**: unchanged (photo, name, price, quantity, zones).
- **Orders dashboard**: shows buyer name, phone, delivery address, zone, items, total. Two buttons: **Mark On the Way**, **Mark Delivered**. Delivered starts 4-hour escrow window.
- **Bank details**: captured at signup; used by admin to create Paystack subaccount lazily on first payout.

## 4. Admin

- Zones CRUD.
- Vendors: suspend / reinstate only (no approval).
- Orders overview.
- Disputes: single **Refund** button → Paystack refund API.

## 5. Paystack integration

Server functions in `src/lib/payments.functions.ts`:
- `ensureSubaccount(vendorId)` — creates Paystack subaccount from vendor bank details if missing.
- `initCheckout({ zoneId })` — reads cart from client input, builds split, creates orders (one per vendor), returns access_code.
- `verifyPayment(reference)` — marks paid + escrow held, sends notifications.
- `refundOrder(orderId)` — admin dispute resolution.
- `releaseEscrow(orderId)` — Paystack transfer to vendor subaccount balance (subaccount split already routed funds; escrow release here just flips `escrow_status`).

Auto-release: `pg_cron` every 15 min → `/api/public/hooks/escrow-release` flipping `escrow_status='released'` for orders past `escrow_release_at` without dispute.

Uses existing `PAYSTACK_SECRET_KEY` secret.

## 6. Notifications

- In-app `notifications` rows written on every state change (already present).
- Web Push (VAPID) added as a follow-up — for now, in-app toast + list. Deep links via TanStack Router.

## 7. Files touched

- Migration: single SQL file for schema deltas + `gen_order_number()` function.
- Delete: `src/routes/vendor.pending.tsx`.
- Edit: `signup.tsx` (address), `vendor.signup.tsx` (no pending), `index.tsx` (AI bar), `checkout.tsx` (Paystack), `orders.$id.tsx` + `vendor.tsx` (new statuses + 4h window), `admin.tsx` (zones/vendors/disputes tabs).
- Add: `src/routes/vendor.$id.tsx` (storefront), `src/lib/ai-search.functions.ts`, `src/lib/payments.functions.ts`, `src/routes/api/public/hooks/escrow-release.ts`.

## Build order

1. Schema migration (breaking — resets orders/products status semantics).
2. Vendor signup no-gate + buyer signup address.
3. Vendor storefront route.
4. AI chat search on home.
5. Paystack split checkout + verify.
6. 4-hour escrow + auto-release cron.
7. Admin refund + suspend.
8. Push notifications (VAPID) — final polish.

Approve to start with **step 1: schema migration**.