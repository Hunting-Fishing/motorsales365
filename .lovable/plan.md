## Goal
Make `/browse/$category` filters category-specific (Cars, Motorcycles, Boats, Airplanes, Heavy Equipment) and ensure the listing editor captures the matching fields so filters actually return results.

## Approach
All extra fields already live in `listings.attributes` (jsonb). Browse filters use `attributes->>key ilike ...`. So this is mostly a frontend-only change: add per-category filter UI + edit-form fields, wire them through the search schema, and write/read the same attribute keys on both sides.

No DB migration needed (jsonb absorbs new keys). No business-logic changes outside the listing form and browse page.

## Filter spec by category (attribute keys)

**Cars** (`car`)
- transmission (auto/manual/cvt/dct), fuel (gas/diesel/hybrid/ev/lpg), mileage_min / mileage_max, body_type (sedan/suv/hatch/pickup/van/coupe/mpv), registered_owner (1st/2nd/3rd+), or_cr_status (complete/lost/in_process), flood_history (yes/no/unknown), accident_history (yes/no/unknown), financing_available, trade_accepted, verified_documents_only

**Motorcycles** (`motorcycle`)
- engine_cc_min/max, moto_type (scooter/underbone/big_bike/tricycle/dirt_bike), or_cr_status, plate_status (with/without/temporary), registered_owner, modified (stock/modified), delivery_available

**Heavy equipment** (`equipment`)
- equipment_type (excavator/loader/bulldozer/crane/forklift/dump_truck/grader/compactor), hours_min/max, brand, operating_weight_min/max (tons), attachment_type, rental_or_sale (rental/sale/both), with_operator, inspection_available

**Boats** (`boat`)
- boat_type (banca/yacht/speedboat/sailboat/fishing/jetski), hull_material (fiberglass/aluminum/wood/steel/inflatable), engine_type (outboard/inboard/sail/electric), length_min/max (ft), registration_status (registered/unregistered/in_process), trailer_included, usage (commercial/fishing/recreation)

**Airplanes** (`airplane`) — higher-trust workflow
- registration_no (text), airworthiness (current/expired/in_process), maintenance_logs (complete/partial/none), engine_hours_min/max, airport_code (text), broker_or_owner (broker/owner/dealer), inspection_required (yes/no)
- Listing form shows a notice: aircraft listings require admin review before going live (already covered by existing pending → admin.listings flow).

## File changes

1. **`src/routes/browse.$category.tsx`**
   - Extend `searchSchema` with all keys above (all `.optional()`, coerce numerics).
   - Build the query filters per-category in the existing supabase query block, using `attributes->>key` ilike for strings, `(attributes->>key)::int` range for numerics, and `attributes->>key = 'true'` for booleans.
   - Replace the single `VehiclePicker` block with a `<CategoryFilters category={category} value={state} onChange={...} />` component that renders only the fields relevant to the current category. Keep keyword/location/price/sort shared.
   - Update the Apply-filters navigate() call to include the new keys.

2. **`src/components/browse/category-filters.tsx`** (new)
   - One component, switch on `category`. Uses existing shadcn `Select`/`Input`/`Checkbox`. Pure controlled component, no data fetching.
   - Co-locate option lists (transmissions, body types, equipment types, etc.) at the top of the file.

3. **`src/routes/listing.$id.edit.tsx`** and **`src/routes/sell.tsx`** (the creator flow)
   - Add the same per-category field sets, gated by `category_slug`, writing to `attributes` with the keys above.
   - Reuse the new option lists from `category-filters.tsx` so labels stay in sync.
   - Aircraft section shows the trust notice and keeps `status='pending'` on submit (existing behavior).

4. **Listing detail (`src/routes/listing.$id.tsx`)**
   - Add a small "Specs" block that renders any present attributes (label/value rows) so the new data is visible to buyers. No layout overhaul.

## Out of scope
- No schema migration; `attributes` jsonb already holds arbitrary keys.
- No changes to towing/carwash/parts/drone/repair categories (already category-specific).
- No verification workflow changes for aircraft beyond surfacing the existing pending-review notice.
- No SEO copy rewrites beyond keeping current `head()`.

## Verification
- Create one test listing per category with the new fields filled in, then open `/browse/<category>` and confirm each new filter narrows the result set correctly.
- Check `/listing/:id` shows the new specs block.
- Build passes (typecheck covers the extended zod schema and form state).
