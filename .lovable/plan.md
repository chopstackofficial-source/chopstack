# Chopstack Rebuild — Hyperlocal Grocery Ordering

Complete redesign around zones, cart-first browsing, Paystack escrow + split, and admin-managed vendors. Keeps existing logo/splash. Uses current Supabase + TanStack Start stack.

## Data model (new / replaced)

Wipes legacy `listings/splits/bundles/split_participants` in favor of a clean schema. Keeps `users` for auth, adds role fields.

- `zones` — id, name, delivery_fee, active
- `vendors` — id (=auth user), name, phone, email, bank_name, account_number, account_name, paystack_subaccount_code, paystack_recipient_code, status (pending/approved/suspended), rejection_reason
- `products` — id, vendor_id, name, photo_url, price, quantity, is_sold_out
- `product_zones` — product_id, zone_id
- `buyers` — id (=auth user), name, phone, email, zone_id
- `orders` — id, order_number (5-digit unique), buyer_id, vendor_id, zone_id, subtotal, delivery_fee, total, payment_reference, payment_status, escrow_status (held/released/disputed/refunded), delivery_status (pending/packed/out_for_delivery/delivered/cancelled), delivered_at, escrow_release_at, created_at
- `order_items` — id, order_id, product_id, name_snapshot, unit_price, quantity, fulfilled_quantity, refund_amount
- `disputes` — id, order_id, buyer_id, reason, status, resolution, created_at
- `notifications` — id, user_id, user_type, title, body, deeplink, is_read, created_at
- `user_roles` — reuse existing (`admin`, `vendor`, `buyer`)

RLS everywhere; GRANTs to authenticated/service_role. Anon SELECT only on `zones` + approved-vendor `products` + their zones (for guest browsing).

Order number = zero-padded 5-digit from a Postgres sequence starting at 10000, with unique index. Cart stays in `cart_items` (already planned).

## Buyer flow

- **Guest browse**: `/` shows zone picker (persist in `localStorage` until account), search bar "What do you need?", live feed filtered to zone. Only `is_sold_out=false` AND `quantity>0` AND vendor approved.
- **Product card**: photo, name, ₦ price, qty, vendor name. Tap → detail → add to cart.
- **Cart**: grouped by vendor, subtotal, single flat delivery fee (buyer's zone), total. Checkout prompts auth if guest.
- **Onboarding (signup)**: name, phone, email, password, zone (dropdown from `zones`). Persisted to `buyers`.
- **Checkout**: Paystack inline with `split_code` (dynamic multi-split when >1 vendor) or `subaccount` (single vendor). Server verifies + creates orders (one per vendor) sharing the same order_number prefix — actually one order_number per vendor order for clarity. Escrow marked `held`.
- **Order status**: Pending → Packed → Out for Delivery → Delivered. 24h countdown after delivered with Confirm / Dispute buttons.
- **History**: list past orders, delete allowed once escrow resolved.

## Vendor flow

- Signup collects bank details → status `pending`.
- Admin approval creates Paystack subaccount + transfer recipient via server fn.
- Dashboard: pending orders list, product list.
- **Add product** form (5 fields): photo, name, price, qty, zones (multi-select).
- Product row: Sold Out toggle, Edit, Delete.
- **Order actions**: update status; Partial fulfil (per-item fulfilled qty → auto Paystack refund for delta); Cancel (full refund); Mark Delivered (starts 24h); Delete after resolved.

## Admin flow

- `/admin` gated by `has_role(admin)`.
- Zones CRUD (name + delivery fee).
- Vendors: approve / reject (with reason) / suspend. Shows bank details.
- Orders overview across all vendors.
- Disputes queue: release to vendor OR refund buyer (Paystack refund API).

## Payments (Paystack)

Server fns in `src/lib/payments.functions.ts`:
- `createSubaccount(vendorId)` — on admin approval.
- `createRecipient(vendorId)` — on admin approval (transfers).
- `initCheckout(cartSnapshot, zoneId)` — computes per-vendor splits, creates pending orders, returns `access_code` + reference for Paystack inline.
- `verifyPayment(reference)` — marks paid + escrow held.
- `partialRefund(orderId, amount)` / `fullRefund(orderId)` — Paystack `/refund`.
- `releaseEscrow(orderId)` — Paystack `/transfer` to vendor recipient.

Escrow auto-release: pg_cron every 15 min → `/api/public/hooks/escrow-release` route → releases orders with `delivered_at + 24h < now()` and `escrow_status='held'`.

## Notifications

In-app `notifications` table + toast on next fetch. Deep links via TanStack Router `to`. Web Push (VAPID) is deferred — noted in code with TODO, but every event writes a notification row so the badge + list work day one.

## Routes (TanStack Start)

Replace/add:
- `/` — home (guest OK), zone picker + feed + search
- `/product/$id`
- `/cart`
- `/checkout` — auth gate
- `/orders` / `/orders/$id`
- `/signup`, `/login`, `/onboarding` (zone select)
- `/vendor` (dashboard), `/vendor/products/new`, `/vendor/products/$id/edit`, `/vendor/orders/$id`, `/vendor/signup`, `/vendor/pending`
- `/admin`, `/admin/zones`, `/admin/vendors`, `/admin/orders`, `/admin/disputes`

Public routes stay SSR; vendor/admin under `_authenticated/`.

## UI

Mobile-first, bold product tiles, big ₦ prices, minimal chrome. Keep existing logo + splash + favicon. Use `sonner` toasts. BottomNav: Home, Search, Cart (with badge), Orders, Account.

## Build phases (in order)

1. **Schema migration** — drop legacy tables, create new ones, seed 3 sample zones, sequence, RLS/GRANTs, admin bootstrap.
2. **Buyer core** — home/zone/feed/search/product/cart/checkout stub (no Paystack yet, marks paid), orders list/detail with escrow UI.
3. **Vendor core** — signup, pending screen, product CRUD, orders dashboard w/ status + partial + cancel + deliver.
4. **Admin** — zones, vendor approval, orders, disputes.
5. **Paystack** — subaccount + split checkout + verify + refund + transfer + pg_cron escrow release.
6. **Polish** — notifications UI, order numbers on all screens, empty states, favicon.

## Technical notes

- Order number: `CREATE SEQUENCE order_number_seq START 10000;` default `LPAD(nextval::text, 5, '0')`. Overflow past 99999 handled by widening later.
- Split payment: use Paystack "Multi-split" via dynamic split creation per checkout when >1 vendor; single-vendor uses `subaccount`. Vendors without subaccount block checkout of their products.
- Refunds: instant Paystack refund; buyer notification includes new order total.
- Escrow cron: `pg_cron` + `pg_net` → `/api/public/hooks/escrow-release` with `apikey` header.
- Guest cart: same `cart_items` table keyed by anon session id in `localStorage`; on signup, migrate rows to `user_id`.
- Keep current auth (Supabase email/password + Google). No changes to auth-attacher / middleware.
- Delete unused: bundles/*, splits, transporter code from prior plan (out of scope now).

Approve to start with Phase 1 (schema migration).
