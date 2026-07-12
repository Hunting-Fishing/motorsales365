## Fix listing form: floating Save, remove duplicates, mandatory history, cleaner sections

### 1. Floating "Save" widget (edit + sell)
- Create `src/components/listings/floating-save-widget.tsx` — a fixed bottom-right pill button matching `FloatingHelpWidget` style (offset above it, e.g. `bottom-20 right-4`). It renders a "Save changes" / "Publish" button that dispatches a `requestSubmit()` on the form via a passed ref (or a shared `formId`).
- Wire it into `src/routes/listing.$id.edit.tsx` and `src/routes/sell.tsx`. Show a compact status: idle / "Saving…" / disabled while invalid, with the same busy flag currently on the inline Save button.
- Keep the inline footer Save button too (desktop users expect it), but the floating widget guarantees Save is always reachable on long mobile forms.

### 2. Remove duplicates in vehicle details
Duplicates today (car category):
- `flood_history` and `accident_history` live in **both** `VehicleQualityFields` and `CategoryAttributesEditor` ("More details & buyer filters").
- `or_cr_status` and `owner_status` also appear in both places for car (VQF has plate/OR-related fields near CategoryAttrs' OR/CR).

Fix in `src/components/listings/category-attributes-editor.tsx`:
- Car branch: drop `flood_history`, `accident_history`, `or_cr_status`, `owner_status` selects and their entries in `CATEGORY_ATTR_KEYS.car`. Keep body_type, drivetrain, TrustBlock.
- Motorcycle branch: drop `or_cr_status`, `owner_status` if surfaced in VQF; keep type/engine_cc/plate_status/condition/delivery + TrustBlock.

### 3. Merge "More details & buyer filters" into "Vehicle details & documents"
- In `listing.$id.edit.tsx` and `sell.tsx`: delete the separate "More details & buyer filters" wrapper block. Render `CategoryAttributesEditor` inline directly beneath the existing vehicle details grid, under the same section header — no second card/heading.

### 4. Mandatory flood/accident history (VQF)
- In `src/components/vehicle-quality-fields.tsx`: mark `flood_history` and `accident_history` as required for car/motorcycle. Apply `mandatoryFieldClass` (orange when empty, green when set) to their Select triggers, same pattern as Title/Price/Mileage.
- Add pre-submit validation in `listing.$id.edit.tsx` and `sell.tsx` so a missing flood/accident value blocks save with a toast pointing to the field (same style as the existing `validateVehicleQuality` path).
- Ensure save path already persists them: VQF writes `vehicleQualityToAttributes` first, then `CATEGORY_ATTR_KEYS` loop no longer touches these keys (since we removed them from the list), so values will actually round-trip. Verify hydration on reload still uses `hydrateVehicleQuality(a)` — no change needed there.

### 5. Icon on "Parts needed / known issues"
- In both routes' `<details><summary>` header, prepend a `Wrench` (lucide) icon in a small primary-tinted circle, matching the visual weight of other section icons. Add a subtle left border-accent so the collapsed row is scannable and users don't skim past it.

### Technical notes
- No DB or schema changes. All fixes are frontend + validation.
- `CATEGORY_ATTR_KEYS` edit is the single source that also drives the load-side hydrate loop, so removing keys there prevents both duplicate render and duplicate write.
- Floating widget uses `document.getElementById(formId)?.requestSubmit()` to avoid ref plumbing across the large form tree.
