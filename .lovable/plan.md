## Goal
Let sellers list a used part on `/sell` and tag which vehicles it fits, so the `/parts` wizard can match it.

## Scope

### 1. Add `used_part` category
- Add `used_part` (label: "Used Part", icon: Wrench) to the `CATEGORIES` list used by `/sell` so it appears in the category dropdown.
- Update `category-attributes.ts` to register a `used_part` attribute group:
  - `system` (select — from `NEEDED_PARTS_GROUPS` keys: Engine, Drivetrain, Brakes, …)
  - `part_type` (text — e.g. "Alternator")
  - `condition` (select: New-old-stock / Used-excellent / Used-good / Used-fair / For parts)
  - `oem_aftermarket` (select: OEM / Aftermarket / Unknown)
  - `part_number` (text, optional)
  - `warranty_days` (number, optional)
- Migration: add `'used_part'` to the listing category type/enum and grant the same RLS as other categories. (Standalone migration; everything else ships after it lands.)

### 2. New `FitmentEditor` component
- `src/components/parts/fitment-editor.tsx`
- Manages an array of rows `{ make, model, year_min, year_max, trim? }`.
- Uses existing make/model pickers if present; otherwise text + numeric year fields.
- "Add fitment" button, per-row remove, validation (year_min ≤ year_max, make required).
- Pure controlled component — value + onChange — no Supabase calls.

### 3. Wire it into `/sell`
- Render the editor only when `category === 'used_part'`, after the category attributes block (around line 1460 region).
- On submit, after the listing is inserted and we have `listing_id`, insert the fitment rows into `public.listing_fitment` (bulk insert). Mirror the pattern used for `listing_media`.
- On edit (`listing.$id.edit.tsx`), load existing fitment rows for the listing and pass to the editor; on save, diff/replace (simplest: delete-all + insert).

### 4. Hook the wizard to real data
- `parts-search.functions.ts` already joins listings + fitment. Verify the query filters by `category = 'used_part' OR vehicle_for_parts = true` and by system attribute. Patch if needed once data exists.

## Out of scope
- `vehicle_for_parts` flag on regular vehicle listings (defer — separate request).
- Live inventory feeds, scraping, Tecdoc.
- Changes to `/parts` wizard UI.
- Touching `affiliate-parts-section.tsx`.

## Files
- Migration: add `used_part` to category enum.
- New: `src/components/parts/fitment-editor.tsx`.
- Edit: `src/lib/categories.ts` (or wherever `CATEGORIES` lives), `src/lib/category-attributes.ts`, `src/routes/sell.tsx`, `src/routes/listing.$id.edit.tsx`, `src/lib/parts-search.functions.ts` (verify only).

## Order of operations
1. Migration (enum value) — awaits approval.
2. After approval: category metadata + FitmentEditor + sell/edit wiring in one pass.
