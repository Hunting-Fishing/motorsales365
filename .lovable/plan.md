## Goal
Remove duplicate OR/CR + Owner status fields on `/sell` and tighten spacing so the form scrolls less and leaves room for future fields.

## The duplication (confirmed by reading the source)
The Details tab currently asks for the same things in **three** overlapping places:

| Field                | Where it appears today                                                                                          |
|----------------------|-----------------------------------------------------------------------------------------------------------------|
| OR/CR status         | 1) Top-bar "Registration" select (`sell.tsx:1172-1190`), 2) `VehicleQualityFields` "OR/CR status" (`vehicle-quality-fields.tsx:374`), 3) `CategoryAttributesEditor` "OR / CR status" (`category-attributes-editor.tsx:228 / 242`) |
| Owner status         | 1) `VehicleQualityFields` "Registered owner status" (`vehicle-quality-fields.tsx:357`), 2) `CategoryAttributesEditor` "Owner status" (`category-attributes-editor.tsx:227 / 244`) |

`CategoryAttributesEditor` values (`owner_status`, `or_cr_status`) are the ones the browse filters actually query (see `browse-listings.functions.ts`), so they stay as the source of truth. The other two copies get removed.

## Changes

### 1. Remove duplicates (source of truth = CategoryAttributesEditor)
- **`src/lib/category-attributes.ts`** — expand `OR_CR_STATUS` and `OWNER_STATUS` so the richer nuances from `VehicleQualityFields` aren't lost:
  - OR/CR: add `complete_owner_name`, `complete_open_deed`, `or_only`, `cr_only`, `no_docs`, `encumbered`.
  - Owner: keep existing options, add `casa_maintained`.
- **`src/components/vehicle-quality-fields.tsx`** — drop the `Registered owner status` and `OR/CR status` fields, their options constants, schema refinements, and their entries in `RECOMMENDED_CAR` / `RECOMMENDED_MOTO` / `FIELD_LABELS` / `VEHICLE_QUALITY_KEYS`. Keep everything else (variant, color, plate, history, VIN, price flags).
- **`src/routes/sell.tsx`** — delete the top-bar "Registration" select block (lines ~1172-1190) and the `registrationStatus` state (line ~256/259) plus its usage in the insert payload (grep `registration_status` to clean up).
- **`src/routes/listing.$id.edit.tsx`** — same trim (mirror the shape so edit and create match). Ensure existing listings that had `registered_owner_status` / `orcr_status` stored under vehicle_quality attributes still display via the CategoryAttributesEditor values (which they already write to).

### 2. Tighten the form
Purely CSS-token/spacing changes, no logic:
- Reduce section vertical rhythm in the Details tab: `space-y-3` → `space-y-2`, `border-t pt-3` → `pt-2`, section card padding `p-3 sm:p-4` → `p-2.5 sm:p-3`. Match the Location tab that already uses the tighter padding.
- Collapse the "Vehicle" block (`sell.tsx:1247-1334`) grid from 3 rows of controls to a single `sm:grid-cols-6` row: VIN spans 2, Mileage/Transmission/Fuel each span 1, VehiclePicker spans full width above.
- In `VehicleQualityFields`: change container from `p-3` to `p-2.5`, drop the standalone header block into a single line, remove the completeness meter's own bordered container (inline it under the header), switch inner grid gap `gap-2` → `gap-x-2 gap-y-1.5`, and let the "Price negotiable / Financing / Trade-in" checkboxes wrap inline with the last row instead of getting their own `pt-2` block.
- In `CategoryAttributesEditor` car/motorcycle branches: change `grid-cols-1 sm:grid-cols-2` (current default) to `sm:grid-cols-3` for the short selects so OR/CR + Owner + Financing sit on one line on desktop.
- Reduce `<Label>` bottom margin from default to `mb-0.5` where inputs are `h-8`/`h-9` to remove ~4px per field.

Rough before/after: Details tab currently ~1900 px tall on desktop; target ~1350 px (≈30 % shorter) without hiding any information.

### 3. Non-goals
- No DB/RLS/schema changes. Existing listings keep working — the attributes we stop writing (`registered_owner_status`, `orcr_status` under vehicle_quality, plus `registration_status`) are additive JSON keys that are safe to leave in old rows.
- No copy changes outside the fields being removed.

## Verification
- `tsgo` typecheck.
- Load `/sell` as `car`, `motorcycle`, `truck`, `parts`, `carwash` — confirm exactly one OR/CR select and one Owner select appear (only for car/motorcycle), Registration select is gone, and no field labels shift categories.
- Load `/listing/<id>/edit` on an existing car listing — confirm owner/OR-CR pre-fill from the CategoryAttributesEditor values.
- Publish a new car listing end-to-end and confirm `attributes.owner_status` and `attributes.or_cr_status` are set from the single remaining input.
- Visual diff: screenshot Details tab desktop + mobile before/after; confirm ~30% less scroll distance and no clipping.
