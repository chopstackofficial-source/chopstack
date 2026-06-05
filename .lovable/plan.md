
# ChopStack feature rollout — 3 phases

Sequenced to minimize regressions. Each phase ends in a working app you can test before moving on. I'll deliver one phase per turn so you can verify before the next batch.

---

## Phase A — Foundations (this turn after approval)

**Buyer default delivery address**
- Add `town`, `landmark` columns to `users` (state/lga already exist)
- Edit-profile form gains Town + Landmark fields
- Checkout pre-fills State/LGA/Town/Landmark from profile with a "Change for this order" toggle that overrides per-order only

**Vendor listing fields**
- Add `available_today` (bool), `town` (text) to `listings` (`quantity_available` already exists)
- create-listing & my-listings forms expose the new fields
- Browse filters: "Available today" toggle, Town filter

**Order flow — accept/reject + timers + slots**
- Add to `orders`: `reject_reason`, `accepted_at`, `delivery_slot` (enum: now, 10-12, 12-2, 2-4, 4-6, 6-8)
- Vendor manage-orders gets Accept / Reject (with reason) buttons. Phone numbers on order detail hidden until `status='accepted'`.
- Checkout adds delivery-slot picker
- pg_cron jobs (every 5 min) hitting `/api/public/hooks/order-timers`:
  - pending > 2h → auto-cancel + refund (if paid) + notify
  - accepted & delivered, no buyer confirm > 6h → auto-release escrow
  - accepted > 48h with no activity → auto-complete + release
- All actions write `notifications` rows

**Terms & Conditions**
- New `terms_accepted_at` column on `users`
- Static `/terms` route with the full T&C content (packaging, escrow, 4% commission, delivery split, disputes, suspension, liability, privacy)
- Signup form requires checkbox + records timestamp; vendors/transporters blocked from creating listings until accepted

**Deliverable:** App still works for current buyer/farmer flows; new fields visible; timers running.

---

## Phase B — Transporter, cart, storefront, Google Maps

**Transporter account type**
- Extend `account_type` enum → `'buyer' | 'farmer' | 'transporter'`
- New `transporters` profile table: `nin`, `vehicle_type` (bike/keke/taxi/minivan), `vehicle_photo_url`, `coverage_state`, `coverage_lga`, `bank_*` (reuse pattern from vendors), `is_online`, `failed_deliveries_count`, `suspended_at`
- Signup form: role picker now shows 3 options. Transporter signup collects NIN + vehicle + photo upload (new `transporter-docs` bucket) + bank + coverage + T&C
- Transporter dashboard: online/offline toggle, active job, earnings, rating

**Google Maps integration**
- Trigger `standard_connectors--connect` for `google_maps`
- Server fn `quoteDeliveryFee({pickup, dropoff, vehicleType})` calls Distance Matrix via gateway → returns km × rate (bike 350, keke 450, taxi 650, minivan 800)
- Checkout shows live delivery fee when delivery slot is picked
- Fee added to escrow on payment; on completion, split 80/20 transporter/ChopStack via Paystack transfer (extends existing `escrow.functions.ts`)

**Auto-assignment**
- On vendor accept, server fn picks nearest online transporter in coverage area, creates assignment row, 15-min timer; on timeout/decline → next nearest
- Buyer sees transporter name+phone once assigned; vendor confirms handoff button on order detail
- Transporter ratings table (1-5) shown after completion; 3 failed → auto-suspend

**Cart + storefront + bundles**
- New `cart_items` table (user_id, listing_id, qty, unique per user+listing) — RLS scoped to user
- Cart icon in BottomNav with badge count
- "Build Your Bundle" page = cart view scoped to one vendor with live subtotal
- New `/store/$vendorId` route: profile card, rating, location, last_active (add `last_active_at` to users), active listings grid
- "View Store" link on every listing card
- Checkout from cart creates one order per vendor (multi-vendor split)

**Deliverable:** End-to-end delivery from cart → payment → assigned transporter → completion with payouts.

---

## Phase C — Group buy, search, admin, polish

**Group buy completion**
- Audit existing `splits` table — fill gaps: pickup_date, pickup_time, attendance_confirmed
- pg_cron 2h reminder before pickup_time → notifications to all participants
- "Confirm attendance" button on order page
- Pay-on-collection (no escrow, no commission — already supported via `cash_at_meetup`)
- Vendor-cancel: bulk-notify + refund any prepaid
- Browse tab: Group Buys section with progress bar

**Search & filters**
- Single `/search?q=` route querying listings, users (vendor stores), bundles, splits
- Bundle filters: price range slider + category dropdown

**Admin dashboard** (`/admin`, gated by `has_role(uid, 'admin')` — already wired for chopstackofficial@gmail.com)
- Stats cards: total orders, GMV, active users, completed deliveries (server fn aggregates)
- Orders table with manual Release / Refund buttons (calls existing escrow fns with admin override)
- Users table with Suspend / Reactivate
- Disputes table (existing `disputes` table) with resolution actions
- Delivery-rate editor: new `delivery_rates` table (vehicle_type, naira_per_km) read by quote function

**Deliverable:** Full marketplace.

---

## Technical notes (skip if not needed)

- All new tables get `GRANT` blocks + RLS scoped to owner; admin sees all via `has_role`.
- All server-side logic uses `createServerFn` (no edge functions). Cron endpoints under `/api/public/hooks/*` with `apikey` header pattern.
- Google Maps connector: server-side gateway calls only; no browser key needed for Distance Matrix.
- Paystack transfers extended to handle transporter payouts using same auto-transfer-when-bank-present rule.
- No changes to `client.ts`, `types.ts`, or `routeTree.gen.ts` (auto-managed).
- Existing Cloudflare Worker deploy continues to work — no `server.ts` changes.

---

**Next step:** I implement Phase A end-to-end in the next turn. Reply "implement" or tell me what to adjust.
