## Goal

Make the `/parts` product grid actually filter by the wizard's make / model / year selection — not just concatenate them into a free-text query — and show the user which filters are active.

## Changes

### 1. `src/lib/partner-feed.functions.ts` — `searchPartnerProducts`

Extend the input validator and query:

- New optional fields: `make`, `model`, `year` (string, trimmed, max 40 / year 4 chars).
- Build a token list from `[make, model, year]` plus the free-text `q`. Each non-empty token becomes its own `ilike("title", "%token%")` so all of them must match (AND-ed by PostgREST when chained). Year is only added when it looks like a 4-digit number.
- Keep the existing `country` gate and `limit`.
- If no tokens at all, fall back to current behavior (latest products in country).

This avoids false positives like a `"Toyota Vios parts"` blob matching a Honda listing whose title happens to contain "parts".

### 2. `src/components/parts/partner-products-grid.tsx`

- Add props: `make?: string | null`, `model?: string | null`, `year?: string | number | null`.
- Pass them into the `searchPartnerProducts` call and include them in the `useEffect` deps.
- Above the grid, render a small filter-chip row when any of make/model/year is set: `Toyota` · `Vios` · `2018` with an "Clear" link that calls an optional `onClearFilters` prop (only rendered when provided).
- Empty-state tweak: if filters are active and `items.length === 0`, render a compact "No partner matches for these filters yet — try removing one." card instead of returning `null`, so the user understands why the grid disappeared. With no filters and no items, keep returning `null` (today's behavior).

### 3. `src/routes/parts.tsx`

- Pass `make`, `model`, `year` from `vehicleCtx` into `<PartnerProductsGrid />` alongside the existing `query` (query becomes the broad fallback string; the structured fields drive the actual filter).
- Add `onClearFilters={() => setVehicleCtx({ make: "", model: "", year: "" })}` so users can reset from the grid header. (The wizard keeps its own internal state; clearing here just clears the grid filter — acceptable trade-off, noted below.)

### 4. No schema changes

`partner_products` already has `title`, `brand`, `country`. Token ILIKE on `title` is sufficient for current ingested feeds (Shopee/Lazada/AliExpress PH). Future improvement (not in scope): structured `vehicle_make` / `vehicle_model` columns populated by the ingest job.

## Technical notes

- `PartsWizard`'s existing `onContextChange` callback already fires on every year/make/model change, so no wizard changes are needed.
- AffiliateShopRow already receives make/model/year — unchanged.
- Reset caveat: clicking "Clear" in the grid header clears `vehicleCtx` but does not reset the dropdowns inside `PartsWizard` (which holds its own state). Acceptable for v1; a follow-up could lift wizard state up.

## Files touched

- `src/lib/partner-feed.functions.ts` (validator + query)
- `src/components/parts/partner-products-grid.tsx` (props + chips + empty state)
- `src/routes/parts.tsx` (pass props, wire clear handler)
