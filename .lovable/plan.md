# Make Engine a first-class facet app-wide

The fitment dialog now supports engine, but only the admin shop side knows about it. This plan pushes engine through the rest of the app so visitors can pick an engine, listings advertise an engine, and filters/match logic actually use it.

## 1. Garage (visitor's "my vehicle")

`src/lib/garage.ts`
- Add optional `engine?: string` to `GarageVehicle` (backward compatible — existing localStorage entries just don't have it).
- `formatVehicle()` appends ` — <engine>` when set.

## 2. Vehicle picker that knows about engines

`src/components/shop/vehicle-fitment-picker.tsx`
- After Model select, render an Engine select populated by `getEnginesFor(category, make, model, year)` from `src/data/vehicle-engines.ts`.
- Engine select includes an "Any engine" option and a "Custom…" escape hatch (text input) for models without catalog entries.
- Emit `engine` in the `onSubmit` payload.

This component is reused by the shop filter drawer, so the shop filter inherits engine support automatically.

`src/components/vehicle-picker.tsx` (used by sell/rides flows)
- Add the same Engine select underneath Model, again driven by `getEnginesFor` with a free-text fallback. Lifts `engine` through `onChange`.

## 3. Shop product matching honors engine

`src/lib/shop.functions.ts` — `listShopProducts`
- Add `engine?: string` to the input validator and the `vehicle` param.
- Update the fitment matcher (lines 46–65): a rule passes the engine check when its `engine` is null/empty, OR when the visitor supplied an `engine` that case-insensitively equals the rule's `engine`. If the visitor has no engine selected, engine rules are ignored (current behavior preserved — never hides results).

`src/routes/shop.index.tsx` and `src/routes/shop.$category.tsx`
- Pass `vehicle.engine` through to `listShopProducts` so the new filter actually runs.

## 4. Vehicle listings (sell flow) capture engine

`src/routes/sell.tsx`
- Add an Engine field beside Mileage/Transmission/Fuel for car & motorcycle categories. Uses the same catalog-driven select with free-text fallback.
- On submit, write `attributes.engine` alongside the existing `attributes.year/make/model`.
- Listing edit path: preload `attributes.engine` into state.

`src/routes/dashboard.rides_.new.tsx` and `dashboard.rides_.$id.edit.tsx`
- Replace the free-text "Engine" input with the new catalog-driven select (free-text fallback when unknown). Persist to the existing `rides.engine` text column — no schema change.

## 5. Show engine where vehicles are displayed

- `src/routes/listing.$id.tsx`: render Engine in the spec block when `attributes.engine` is set.
- `src/components/listing-card.tsx`: append engine to the small spec line (`year • make • model • engine`) when available.
- `src/routes/rides.$slug.tsx`: already shows `ride.engine` — verify the label stays consistent.
- Product fitment list on `src/routes/shop.p.$slug.tsx`: already shows engine (done last turn).

## 6. Browse filters get an engine-aware vehicle filter

`src/routes/browse.$category.tsx` (only for `car` / `motorcycle` categories)
- Add a compact `VehiclePicker`-style block above the keyword field: Year / Make / Model / Engine.
- Extend `searchSchema` with `year`, `make`, `model`, `engine` and persist them in URL state.
- Apply against the `attributes` JSON: `.eq("attributes->>make", make)`, `.eq("attributes->>model", model)`, `.eq("attributes->>year", year)`, `.eq("attributes->>engine", engine)` — only when each is set.

## 7. Save searches & SEO niceties

- `dashboard.searches` already serializes the URL query, so the new params ride along with no code changes there.
- `listing.$id.tsx` head(): include engine in the dynamic title/description when present (e.g. "2019 Toyota Hilux 2.4L Diesel — …"). Same treatment for `rides.$slug.tsx`.

## Out of scope (intentionally)

- No DB migration. Rides already has `engine TEXT`; listings keep using `attributes` JSON; `shop_product_fitment.engine` was added last turn.
- No bulk backfill of existing listings — engine is purely additive and optional.
- Engine catalog stays in `src/data/vehicle-engines.ts`; expanding model coverage is a separate, additive task.

## Technical notes

- Engine matching is case-insensitive and string-equal on the stored label (the catalog returns stable labels like `"2.4L Diesel (2GD-FTV)"`). This is intentional — it keeps the data model simple and matches how `make`/`model` are matched today.
- Free-text engines entered by sellers/visitors still work — they just only match other free-text entries with the same string. The catalog ensures most users converge on the same labels.
- All UI changes degrade gracefully: existing listings/garage entries without an engine continue to render and match exactly as they do today.
