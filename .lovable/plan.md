
## Goals

1. Move VIN / chassis to right under Title.
2. When VIN is entered/scanned, auto-populate Category, Year, Make, Model, Engine, Transmission, Fuel, Trim (variant), and Color where the decoder returns them.
3. Re-order the form to a natural step-by-step flow.
4. Kill the wasted horizontal space visible in the screenshot — the form is currently constrained to `max-w-5xl` with narrow selects (see the tiny "Condition" dropdown), leaving big empty gutters on desktop.

## Changes

### 1. New "Listing" section field order
Single top section, everything above the fold:
```
Title
VIN / chassis            [Scan VIN]   ← moved here, full width
Category   Condition   Registration   Seller
Year   Make   Model   Trim / variant
Transmission   Fuel   Engine   Color
Mileage (km)   Body type (car only)   Drivetrain (car only)
```
- The existing separate "Vehicle" `SellGroup` collapses into this — VehiclePicker (year/make/model) and the mileage/transmission/fuel grid move up; the standalone "VIN / chassis" block is removed from its current location.
- New fields wired to existing state: `trim` (already exists in `categoryAttrs.variant`), `color` (add `exterior_color` to categoryAttrs), `engine` (already exists as `engine` state).

### 2. VIN auto-fill (extend `VinScanDialog` + manual entry)
- Extend `VinDecodeResult` to also carry `engine`, `trim`, `bodyType`, `vehicleType`.
- In `decodeVin` (NHTSA), populate from: `DisplacementL`+`EngineModel` → engine; `Trim`/`Series` → trim; `BodyClass` → bodyType; `VehicleType` → category (map "MOTORCYCLE" → `motorcycle`, else `car`).
- On result: set category, year, make, model, engine, transmission, fuel, trim, body type. (Color is not in the VIN standard — leave manual.)
- Add the same auto-fill on manual VIN blur (not only Scan dialog), by calling the existing `decodeVin` server function when 11–17 chars are entered.
- Show a small "Auto-filled from VIN" hint chip beside fields that got populated (dismissible).

### 3. Step-by-step section order
Reorder collapsible `SellGroup`s to a linear flow:
1. Listing (see field order above) — open
2. Price — open
3. Photos & video (already in Media tab; leave tab structure)
4. Location — open
5. Condition & quality — open (drop the duplicated VIN block here)
6. Category details / What you offer — open
7. Filters / tags — collapsed
8. Description — collapsed

The old "Vehicle" group is removed (merged into Listing). Non-vehicle categories simply hide the vehicle rows.

### 4. Reclaim wasted width
- Bump the form container from `max-w-5xl` to `max-w-6xl` on `lg` and `max-w-7xl` on `xl` so the two-column media/details layout fills the viewport shown in the screenshot (1018 px).
- Widen the Listing grids: 4 columns on `sm`, 6 columns on `lg` for the compact selects (Category/Condition/Registration/Seller + Year/Make/Model/Trim). Selects grow to fill their cell (`w-full`) instead of shrinking to content.
- Right column (media) gets `lg:col-span-2` inside a `lg:grid-cols-5` outer grid so details take 3/5 and media 2/5 — no more dead space beside the Condition dropdown.

## Technical notes

- Files touched: `src/routes/sell.tsx`, `src/components/vin-scan-dialog.tsx`, `src/lib/vin-decode.functions.ts` (extend NHTSA mapper to return `engine`, `trim`, `bodyType`, `vehicleType`).
- State already present: `title`, `category`, `year`, `make`, `model`, `engine`, `transmission`, `fuel`, `mileage`, `categoryAttrs`. Add: `categoryAttrs.exterior_color`, `categoryAttrs.variant` (trim).
- Manual VIN blur debounces and only calls the decoder for 17-char VINs (NHTSA requirement); shorter chassis codes still hit the JDM table lookup already implemented in `decodeVin`.
- No DB migration needed — `variant`/`exterior_color`/`engine` all live in the existing `listings.attributes` JSON.
- No changes to submit validation beyond mapping the two new attribute keys.

## Out of scope
- Deeper redesign of Media/Location tabs.
- Adding photo-based color detection.
- Changing the submit flow or backend validators.
