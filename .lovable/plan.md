## What we're building

Three connected pieces:

1. **Seller side** — when posting/editing a vehicle listing, sellers tag what parts are needed (e.g. front pads, rear rotors, all 4 tires, battery) plus confirm/override factory tire size.
2. **Buyer side** — on the listing page, a new **"Get these parts from us"** section appears beside the existing "Parts & accessories" rail. It shows the seller-flagged parts matched to in-house catalog items with a **"Request quote / Reserve"** button (no real checkout yet).
3. **Admin side** — a new **Admin → Parts Fulfillment** tab that centralizes everything we need to operationalize this: catalog management, vehicle-fitment data, incoming quote requests, plus a checklist of accounts/integrations to sign up for (suppliers, tire data, payments, shipping). Future-ready for My Rides "order parts" entry point.

Out of scope this round: live checkout, real inventory/stock, shipping rates, paid tire-size API. We'll add cart/Stripe once fulfillment is set up — the data model below is designed so checkout slots in later without rework.

---

## Buyer experience (listing page)

A new card sits above the existing affiliate "Parts & accessories" rail when the seller has flagged needed parts:

```text
🛠  Parts needed for this car — buy from us
The seller listed these as needed. Request a quote and we'll
prepare the parts for pickup or delivery.

[ Front brake pads ]   Toyota OEM-equiv pads — from ₱2,400   [ Request quote ]
[ Front rotors ]       Vented rotor pair (fits 2018 Vios)    [ Request quote ]
[ All 4 tires 185/60R15 ]  3 matching options                [ See options ]

         [ Request quote for all flagged parts ]
```

Clicking "Request quote" opens a small dialog (name, phone, preferred contact, pickup vs delivery, notes) → creates a `part_quote_request` row. Confirmation toast + email to admin. No payment.

If the seller did NOT flag anything, the card doesn't render — the existing affiliate rail stays as-is.

---

## Seller experience (post listing form)

A new collapsible section in the listing editor: **"Parts needed / known issues"** (only shown for car & motorcycle categories).

- Tag picker pre-seeded with common items grouped by system: Brakes (pads, rotors, calipers, lines), Tires, Suspension (shocks, struts, bushings), Engine (oil change, timing belt, plugs, battery), Electrical, Body, Fluids.
- Free-text "Add custom item" for anything not in the list.
- Tire size field auto-fills from a small internal lookup table (`vehicle_tire_specs`) keyed on year/make/model — seller can confirm or override. Override wins.
- All optional. Empty = nothing shown on listing page.

We reuse the existing `tag-picker` component and the established `attributes` JSONB pattern on `listings`.

---

## Admin → Parts Fulfillment tab

New top-level admin tab (or merged into the existing admin shell, whichever fits the current layout) with four sub-sections:

1. **Catalog** — CRUD over `parts_catalog` (in-house SKUs with title, category, base price, photo, compatible makes/models, stock note).
2. **Quote requests** — inbox view of `part_quote_requests` with status (new → quoted → won/lost), buyer contact, linked listing, internal notes.
3. **Vehicle tire specs** — manage the `vehicle_tire_specs` seed table.
4. **Setup checklist** — static page documenting every external account/integration we'll eventually need, with status (todo / in progress / connected). First-pass list:
   - Parts supplier accounts (local distributors, OEM)
   - Tire wholesalers (Yokohama PH, GT Radial, etc.)
   - Tire-fitment data source (start internal, optionally Tecdoc / TireSize.com later)
   - Payments — already on Stripe via Lovable; flag when to switch this flow to embedded checkout
   - Shipping/logistics (LBC, J&T, Lalamove for delivery)
   - Accounting/invoicing
   - Returns & warranty policy doc

This tab is the single place ops can see "what's still missing to ship a part."

---

## Data model (technical)

New tables (all in `public`, with GRANTs + RLS as per project rules):

- `parts_catalog` — in-house SKU list. Columns: `id`, `slug`, `title`, `description`, `category` (brakes/tires/suspension/…), `base_price_php`, `photo_url`, `compatible_makes` (text[]), `compatible_models` (text[]), `year_min`, `year_max`, `active`, `sort_order`, timestamps. Public read (active only), admin write.
- `vehicle_tire_specs` — `id`, `make`, `model`, `year_min`, `year_max`, `front_size`, `rear_size`, `notes`. Public read, admin write. Seeded with a starter set; expand over time.
- `part_quote_requests` — `id`, `listing_id` (nullable, also supports My Rides later via `ride_id` nullable), `requester_user_id` (nullable for guests), `contact_name`, `contact_phone`, `contact_email`, `delivery_method` (pickup/delivery), `notes`, `items` (jsonb: array of {kind: 'catalog'|'custom', catalog_id?, label, qty}), `status` (new/quoted/accepted/rejected/cancelled), `internal_notes`, timestamps. Requester can read their own; admins read all; inserts allowed for auth + guest (rate-limited by IP/email at the server-fn level).

Listing-side: add `attributes.needed_parts` (array of `{ key, label, qty? }`) and `attributes.tire_size_confirmed` (string) to the existing `listings.attributes` JSONB — no schema change required.

### Server functions (`createServerFn`)

- `getNeededPartsForListing({ listingId })` → reads listing attributes + joins matching `parts_catalog` rows → returns the merged list rendered by the buyer card.
- `getTireSpec({ make, model, year })` → looks up `vehicle_tire_specs`, used by the seller form to pre-fill.
- `createPartQuoteRequest({ listingId?, rideId?, items, contact, ... })` — public (no auth required), Zod validated, rate-limited; inserts and notifies admin via existing email pipeline.
- `listPartQuoteRequests`, `updatePartQuoteRequest` — admin-only (role check via `has_role`).
- CRUD for `parts_catalog` and `vehicle_tire_specs` — admin-only.

### Files (high level)

- `src/components/listing/needed-parts-rail.tsx` — the new buyer-side card.
- `src/components/listings/needed-parts-editor.tsx` — seller-side tag picker + tire size confirm.
- `src/components/part-quote-dialog.tsx` — quote request dialog (shared between listing page and future My Rides).
- `src/lib/parts-fulfillment.functions.ts` — all the server fns above.
- `src/routes/admin.parts.tsx` (+ children for catalog / quotes / tire-specs / setup) — admin tab.
- `src/data/parts-catalog-seed.ts` + migration seed for `vehicle_tire_specs`.

### Reuse / no rebuild

- The existing `affiliate-parts-section.tsx` stays untouched and continues to render below the new "from us" rail — they serve different intents (affiliate = browse, in-house = act on this car).
- Reuses `tag-picker`, `image-with-skeleton`, `formatPHP`, existing admin layout, existing email pipeline, existing `has_role` security pattern.

---

## Rollout

1. Migrations + seed data.
2. Seller form section (behind `needed_parts` feature flag if you want to soft-launch).
3. Buyer-side rail + quote dialog.
4. Admin Parts Fulfillment tab (catalog, quotes inbox, tire specs, setup checklist).
5. Wire "Order parts" entry from My Rides into the same dialog (no new backend work — just pass `rideId`).
6. Later: swap "Request quote" for embedded Stripe checkout once supplier + shipping are set up.

### Policy sync

Selling parts directly = new commerce surface. We'll update `/terms` (add parts sales, quote process, refund/returns reference) and `/refund-policy` (parts returns/warranty) with the rollout, and bump "Last updated".
