## Goal

After buyers pick a vehicle + system + part in the Parts Wizard, also:
1. Surface **matching catalog entries** (parts_catalog) as quick-reference cards (typical price, photo, OEM-equivalent name) above the listings.
2. **Rank listings** by fitment quality (exact year+make+model > make+model > make-only > attribute-only) instead of treating them all equally.
3. Let buyers **filter by OEM vs Aftermarket** and search by **OEM part number** so they can find a specific Toyota 90919-01247 etc.

No DB schema changes — `listing_fitment`, `listings.attributes.oem_or_aftermarket`, and `attributes.part_number` are already captured at sell-time.

## Changes

### 1. `src/lib/parts-search.functions.ts` — smarter `searchUsedParts`

- Accept new inputs: `oemPreference: "any" | "oem" | "aftermarket"`, `partNumber: string | null`.
- When a vehicle is provided, fetch `listing_fitment` rows including `year_min/year_max` (not just listing_id). Compute per-listing **match score**:
  - 3 = make+model+year in range
  - 2 = make+model match
  - 1 = make-only OR attribute fallback (`attributes.make/model`)
  - 0 = no vehicle match (excluded when vehicle provided)
- After the existing part_keys/systems filter, apply OEM filter against `attributes.oem_or_aftermarket` and substring-match `attributes.part_number` (case-insensitive) when provided.
- Sort: boosted first, then `matchScore` desc, then created_at desc. Return `match_score` on each listing.
- Add a sibling server fn `suggestCatalogParts({ partKeys, systems, make, model, year })` that queries `parts_catalog` where `category` ∈ selected systems OR `slug/title` fuzzy-matches selected part labels, filtered by `compatible_makes` / `compatible_models` / year range when provided. Returns top ~6.

### 2. `src/components/parts/parts-wizard.tsx` — wizard UX

- Step 3 (parts): add a small **OEM / Aftermarket / Any** segmented control and an optional **OEM part #** input.
- On submit, call both `searchUsedParts` and `suggestCatalogParts` in parallel; store both results.
- Step 4 (results):
  - New "Catalog suggestions" strip on top (cards from `parts_catalog`) with a "Typical price" badge and a "Find sellers" button that scrolls to the listings below — only shown when suggestions exist.
  - Each listing card gets a small **match badge** ("Exact fit • 2018 Civic" / "Fits Civic" / "Make match" / "Attribute match") driven by `match_score`.
  - When no listings match but catalog suggestions exist, encourage "Post a wanted ad for this exact part" (existing CTA, prefilled with catalog slug).

### 3. `src/components/listing-card.tsx` — optional badge slot

- Accept an optional `badge?: { label: string; tone: "exact"|"good"|"loose" }` prop and render it in the card header. No visual change when omitted.

### 4. `src/routes/parts.tsx` — copy tweak

- Update the "How it works" strip to mention catalog suggestions + OEM filtering.

## Out of scope

- No new tables, migrations, or RLS changes.
- Sell flow stays as-is (OEM/part number already collected).
- No live OEM-number database import — uses what sellers entered.
- Affiliate parts section unchanged.

## Validation

- Wizard with `2018 Honda Civic → Brakes → Front brake pads` shows: catalog card for "Front brake pads (OEM-equiv)" + listings sorted with exact-year fits first.
- Toggling **OEM only** hides listings tagged Aftermarket.
- Typing a part number narrows listings to ones whose `attributes.part_number` contains that string.
- Typecheck passes; no DB migration required.