## Problem

Right now, clicking a catalog item (e.g. "Flatbed Tow") opens the full `ServiceEditor` form (photo upload, title, description, pricing block, custom price label, public toggle). That is too much for Filipino business owners who aren't tech-savvy, and the resulting data is inconsistent across businesses so buyers can't easily compare prices.

The previous design was a simple spreadsheet-style menu: one row per service with just `Service | Price | (optional region/note)`. We want that back as the default flow, and standardize it across every business type so buyers see the same shape everywhere.

## Goal

A simple, standardized "restaurant menu" style editor:
- Pick from the catalog → row appears immediately in the list (no modal/form).
- Each row is a single line: **Service name | Price (₱) | Unit | (optional) Note** with a delete button.
- One save action commits any edits. No photo upload, no description, no "active" switch by default — that lives behind an optional "More" toggle for power users.
- Identical UX for every business type (tow, repair, carwash, tires, fuel, etc.), so listings stay comparable.

## Scope

Frontend only. Database schema, server functions, and the catalog data stay as-is. We're changing the editor presentation, not the saved fields.

## Changes

### 1. `src/components/business/service-catalog-picker.tsx`
- Keep `CatalogPicker` exactly as-is (search + suggest + custom + grouped rows). It's working.
- Add a new exported `ServiceMenuRow` component: an inline row with
  - Service title (read-only, from catalog)
  - `₱ price` input (numeric, the only thing most owners need to fill)
  - Unit dropdown (defaults to the catalog item's `default_unit`, dropdown shows `UNIT_OPTIONS`)
  - Short "Note" input (maps to existing `price_label` or `description` — pick `price_label` so it shows on the public page next to the price, e.g. "Metro Manila only")
  - Trash icon to delete
  - A small "More" disclosure that reveals: photo, long description, promo price, hidden toggle (keeps power-user fields available without cluttering the default view).
- `PricingFields` stays for the "More" panel but the default row uses a compact inline version.

### 2. `src/routes/dashboard.businesses_.$id.edit.tsx` (services section, ~lines 970–1100)
- When the user picks a catalog item, **do not** open `ServiceEditor`. Instead, immediately call `upsertBusinessService` with `{ title, catalog_key, category, unit: default_unit }` and refresh — the row joins the menu list.
- Replace the current `Card` per-service block with `ServiceMenuRow` rows grouped by category (same grouping we already have).
- Each row autosaves on blur of the price/unit/note inputs (debounced) via `upsertBusinessService`. Buyers always see fresh prices, and owners never hit a "Save" wall.
- Keep "Custom item" → that one still opens the full `ServiceEditor` (custom items need a title field).
- Keep delete confirmation.

### 3. Public page (`src/routes/businesses.$slug.tsx`)
- No structural change. The existing `formatServicePrice` already renders `₱price/unit` and respects `price_label`. Standardized rows in the editor will naturally produce standardized output.

## Technical notes (for the dev reading this)

- Autosave: wrap each row in a small `useDebouncedCallback` (200–400ms) around `upsertBusinessService`. On error, toast + revert local state.
- Type changes: none. `ServiceFormValue` already has `price_php`, `unit`, `price_label`.
- Sort order: preserve `sort_order` on insert (use `services.length` like today).
- A11y: each input gets an associated `<Label className="sr-only">` because the column header is shown once at the top of the table.

## Out of scope

- Catalog data, suggestions flow, admin review — all unchanged.
- Products tab — unchanged (this only touches Services).
- Schema/migrations — none.

## Visual sketch

```text
Towing                                                    [+ Add from catalog]
────────────────────────────────────────────────────────────────────────────
 Service                  Price (₱)   Unit       Note                    ⋯
 Flatbed Tow              [  2500  ]  [per trip] [Metro Manila only ]   🗑  ▸More
 Wheel-lift Tow           [  1800  ]  [per trip] [                  ]   🗑  ▸More
 Roadside Jumpstart       [   500  ]  [per job ] [                  ]   🗑  ▸More
                                                            [+ Custom item]
```
