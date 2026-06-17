## Goal
Make `/sell` dramatically more compact across all 4 tabs — fewer cards, tighter spacing, 2–4 fields per row wherever sensible, and remove the Facebook Marketplace import entry point. Keep all information and existing logic intact.

## 1. Remove Facebook Marketplace import
- `src/routes/sell.tsx`: delete the "Already selling on Facebook Marketplace?" banner (~lines 960–971) and its `<Link to="/sell/import">` button.
- Delete `src/routes/sell.import.tsx` so the `/sell/import` route is gone.
- Leave `src/lib/facebook-import.*` server code in place (still referenced by `business-discover.server.ts`); only the user-facing entry point is removed.

## 2. Global density pass on `/sell`
Apply consistently to every `<section>` block in the form:
- Card padding `p-3 sm:p-4` → `p-2.5 sm:p-3`; section vertical rhythm `space-y-3` → `space-y-2`.
- Section headings: `font-display text-base font-semibold` → `text-sm font-semibold`, with `mb-1` not implicit margin.
- All grids: `gap-4` → `gap-2 sm:gap-3`. Promote `sm:grid-cols-2` to `sm:grid-cols-2 lg:grid-cols-3` (and `lg:grid-cols-4` where fields are short like Year/Make/Model/Trim, Mileage/Transmission/Fuel, Stock/Brand/OEM).
- Labels: add a shared `text-xs font-medium` style; inputs/selects/triggers use `h-9 text-sm`.
- Helper text: `text-[11px]` and collapse to a single line where possible.
- Outer container `max-w-3xl` → `max-w-5xl` so multi-column rows actually have room.
- Remove the page subhead "Reach buyers across the Philippines." (saves a row).

## 3. Tab-by-tab reorganization

### Details tab
Combine the current 3 stacked cards (Basics, Service category extras, Vehicle details) into **one card with collapsible subsections**:
1. Row 1 (4-up on lg): Category · Condition · Registration · Negotiable/Hide-price chips
2. Row 2 (full): Title
3. Row 3 (3-up): Asking price · "Negotiable" toggle · "Hide price" toggle inline
4. "Pull from your Rides" collapses to a compact inline `<Select>` on the top-right of the card header (only when `myRides.length > 0`), not a full banner.
5. Vehicle block (when category is vehicle): VIN row (input + Scan button, 2-up), then Year/Make/Model/Trim in a 4-up grid on lg, then Mileage/Transmission/Fuel in 3-up.
6. Description: full-width textarea, reduce `min-h` to `min-h-[96px]`.
7. Category-specific blocks (service/parts/used_part/drone/towing/etc.) stay but switch to `grid sm:grid-cols-2 lg:grid-cols-3 gap-2`, smaller chips (`px-2 py-0.5 text-[11px]`), and no extra wrapper card — render inside the same Details card under a thin divider.

### Location & Seller tab
One card, 3-up grid on lg:
- Row 1: Region · Province · City (from LocationPicker, rendered inline rather than its default stacked layout if it accepts a `layout="inline"` prop; otherwise wrap with `[&_label]:text-xs [&_>div]:gap-2`).
- Row 2: Barangay · Landmark · Seller type
- Row 3: Phone (PhoneInput, 2 cols) · "Show exact pin" toggle (1 col)

### Plan & Boost tab
- Plan cards: switch from stacked to `grid sm:grid-cols-2 lg:grid-cols-3 gap-2`, reduce internal padding, drop long marketing copy to a single line + "details" popover.
- Boost add-ons: render as a compact 2-up checklist instead of stacked rows.

### Photos tab
- Uploader stays full-width (drag area needs space), but trim padding and helper text. Thumbnail grid bumped from 3 to 4–6 cols on lg.

## 4. Sticky tab strip
Already compact; keep but reduce `py-1` → `py-0.5`, progress bar `h-1.5` → `h-1`. Stepper labels stay full on `sm+`, abbreviate to "1 / 2 / 3 / 4" under `sm`.

## Files touched
- `src/routes/sell.tsx` — major layout/spacing rework, FB banner removal, single Details card, multi-column rows.
- `src/routes/sell.import.tsx` — delete.
- No other files; no schema, no business logic, no submit-payload changes.

## Out of scope
- No changes to validation, submit logic, pricing rules, or what gets saved.
- No changes to LocationPicker, VehiclePicker, VehicleQualityFields internals beyond container styling — if any can't render inline cleanly, wrap them with utility-class overrides rather than refactoring the component.
