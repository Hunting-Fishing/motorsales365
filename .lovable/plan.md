# Per-Business-Type Service Catalog + Crowd Pricing

Replace the generic "Price / rate label" free-text field with a structured **Services table** on every business type, powered by a shared catalog. Users pick from approved services for their type, or propose a new one via **+ Add service** — proposals queue to an admin for approval. Each service shows **what other businesses charge** so owners can price competitively and shoppers can compare.

## What changes for the user

**On `/businesses/submit` and the dashboard edit page**
- Remove the generic "Price / rate label" field from the top of the form.
- Add a **Services & Pricing table** scoped to the selected business type:
  - Columns: Service · Your price · Unit · Notes · Avg / Low / High across other businesses · Remove
  - **+ Add service** opens a dropdown of approved catalog services for that business type (same UX as the type dropdown we just fixed). The user picks one, then fills price + optional notes.
  - At the bottom: **Suggest a new service** (small link). Opens a tiny form (title, suggested unit, optional sample price, description). Submits to the moderation queue. Toast: "Sent for review — you can keep this service in your list now, it will go live after admin approval."
  - Pending-suggestion rows show a "Pending review" badge and only the owner sees them publicly until approved.
- Live "compare" hint per row: e.g. *"12 businesses · avg ₱150 · ₱100–₱200"*. Click to see a small popover listing other businesses + their price (anonymous count if <3 for privacy).

**On the public business profile (`/businesses/[slug]`)**
- Services tab becomes a real table (Service · Price · Unit · Notes) instead of free-text label.

**Admin page (`/admin/service-suggestions`, new)**
- Table of pending suggestions: proposed title, business type, submitter, suggested price/unit, sample sightings, similar existing services.
- Actions per row: **Approve** (adds to catalog, optionally merges into an existing catalog item), **Reject** (with note), **Edit then approve**.
- Bell-notification + email to admins on each new suggestion (reuses existing `ops_alerts` / admin notification plumbing).

## Data model

New tables (all in `public`, with GRANTs + RLS as per project rules):

1. **`service_catalog`** — the approved master list per business type.
   - `id`, `business_type_slug` (FK→`business_types.slug`), `key` (stable slug), `title`, `description`, `default_unit`, `sort_order`, `active`.
   - Read: anyone (`anon`+`authenticated`). Write: admins only.
   - Seed from existing `FUEL_STATION_CATALOG` + curated starter sets for towing, repair_shop, carwash, tire_shop, battery_shop (Battery Jump Start, Fuel Delivery, Flat-tire change, Lockout, etc.).

2. **`service_catalog_suggestions`** — moderation queue.
   - `id`, `business_type_slug`, `proposed_title`, `proposed_unit`, `proposed_description`, `sample_price_php`, `submitter_id`, `submitter_business_id`, `status` (`pending|approved|rejected|merged`), `admin_note`, `merged_into_catalog_id`, `decided_by`, `decided_at`, timestamps.
   - Read: submitter sees own; admins see all. Insert: any authenticated user.

3. **`business_services`** (existing) — extend:
   - Already has `catalog_key`, `unit`, `price_php`, `sale_price_php`, `price_label`. **Add** `catalog_id uuid` (FK→`service_catalog.id`, nullable) and `pending_suggestion_id uuid` (FK→`service_catalog_suggestions.id`, nullable) so pending services can still be saved against the business and auto-link to the approved catalog row when the suggestion is approved.

4. **Remove** `businesses.price_label` from the submit/edit UI (keep the column for now to avoid data loss; just stop writing/showing it). Migrate any existing values into a default `business_services` row in a one-shot data migration.

## Crowd price comparison

- New server fn `getServicePriceStats({ catalogId | catalogKey, businessTypeSlug, excludeBusinessId? })`:
  - Queries `business_services` where `catalog_id = ?` AND service is `active` AND the parent business is `published`.
  - Returns `{ count, avg, min, max, samples: [{businessId, name, slug, price, unit}] }`.
  - Samples capped at 10, omitted entirely if `count < 3`.
- Cached via TanStack Query, used by:
  - Each row in the owner's services editor (compact stats inline).
  - A new "Compare prices" popover on the public business profile.

## Admin approval flow

- Server fn `approveServiceSuggestion({ id, edits?, mergeIntoId? })` (admin-only): creates/updates `service_catalog` row, marks suggestion `approved` or `merged`, updates all `business_services` rows whose `pending_suggestion_id = id` to set `catalog_id` and clear the pending marker.
- Server fn `rejectServiceSuggestion({ id, note })`: marks `rejected`, leaves the owner's row in place but flagged.
- New admin route `src/routes/admin.service-suggestions.tsx` under `_authenticated` admin layout.
- On insert into `service_catalog_suggestions`, a DB trigger calls `alertOps()` (warning severity, source: `service-suggestion`) → existing admin notification bell picks it up.

## Notifications

- Toast on submit: success / pending review.
- Admin in-app bell: uses existing `ops_alerts` integration (count surfaces in the header bell we already added).
- Optional email to admins reuses the ops-alerts digest template.

## Files to add / change

**New**
- Migration: `service_catalog`, `service_catalog_suggestions`, columns on `business_services`, trigger to `alertOps`, seed data.
- `src/lib/service-catalog.functions.ts` — `listCatalogForType`, `submitServiceSuggestion`, `getServicePriceStats`.
- `src/lib/admin-service-suggestions.functions.ts` — list/approve/reject (admin-gated).
- `src/components/business/services-table.tsx` — the owner-facing table with +Add dropdown, suggest-new link, and compare stats per row.
- `src/components/business/service-price-compare.tsx` — popover for shopper-side comparison.
- `src/routes/admin.service-suggestions.tsx` — moderation page.

**Edited**
- `src/routes/businesses.submit.tsx` — remove `price_label` field, mount `<ServicesTable typeSlug={...} />`.
- `src/routes/dashboard.businesses_.$id.edit.tsx` — same swap.
- `src/routes/businesses.$slug.tsx` — render services as a table; add compare popover.
- `src/components/business/service-catalog-picker.tsx` — replace the "fuel-only" branch with a generic catalog-driven picker; keep the existing API so other call sites keep working.
- `src/lib/businesses.functions.ts` / `business-pages.functions.ts` — stop requiring `price_label`; include services + catalog joins in the page payload.

## Out of scope (this pass)

- Backfilling historical `price_label` strings into structured services beyond a single best-effort row.
- Per-region price stats (we'll compute nationwide first; region filter can come later).
- Currency other than PHP.
