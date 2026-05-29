## Goal

Make fuel stations first-class on the directory: capturable fuel/charging attributes at signup, a logo/avatar on submit, and a recognizable fuel-pump pin on the map.

## 1. Fuel-station tags (DB migration)

The submit form already shows `business_tags` filtered by `type_slug`. Today there are zero tags scoped to `fuel_station`, which is why the signup had nothing to tick. Add a tag library scoped to `type_slug = 'fuel_station'`, grouped by `category`:

- **Fuel grade / octane** — Gasoline 91, Gasoline 95, Gasoline 97, Gasoline 100, Diesel, Premium Diesel (Euro 5), Bio-Diesel B5, E10 / Ethanol blend, Kerosene, AvGas, Autogas (LPG), CNG.
- **EV charging** — Type 2 AC, CCS2 DC, CHAdeMO, Tesla / NACS, 7 kW, 22 kW, 50 kW, 150 kW+, 24/7 charging.
- **Station services** — Convenience store, Restrooms, ATM, Air & water, Car wash, Lube bay, Tire service, LPG refill, 24/7 open, Loyalty card accepted, Fleet card accepted.

Mark the most common (91, 95, Diesel, Type 2 AC, CCS2 DC, Convenience store, 24/7 open) as `is_popular = true` so they appear in the inline picker; the rest are available via "Browse all tags".

Also mark a few existing top-level tags `is_popular` for fuel-station type if needed — not required, the inline group already supports it.

## 2. Logo (avatar) on submit

The edit screen supports `logo_url` + `cover_url` uploads; the submit screen does not. Add a single **Business logo** uploader to `src/routes/businesses.submit.tsx` (same `storage-upload` helper used elsewhere) and include `logo_url` in the insert payload. Keep cover-image upload edit-only to keep the submission flow short.

## 3. Fuel-pump map pin

In `src/components/businesses/google-business-map.tsx`:

- Replace the generic teardrop SVG with a fuel-pump glyph **only when** `b.type_slug === 'fuel_station'`. Use an inline SVG path of a fuel pump on a rounded badge so it still reads as a pin (colored circle background + white pump glyph, drop-shadow), sized like featured pins so it's easy to tap on mobile.
- Keep the existing teardrop for all other business types.
- Color stays `colorForType('fuel_station')` (current green `#16a34a`).

Files touched: `google-business-map.tsx` only (no schema changes for the map — `type_slug` is already on `GMapBusiness`).

## Technical notes

- Migration uses `INSERT ... ON CONFLICT (slug) DO NOTHING` for each tag so it's re-runnable. New categories: `fuel_grade`, `ev_charging`, `station_services`. The submit form's `prettyCategory` helper auto-renders these as "Fuel grade", "Ev charging", "Station services" — adequate; if we want "EV charging" exactly, add a one-line override in `prettyCategory`.
- Logo upload: reuse `src/lib/storage-upload.ts` and the `business-assets` bucket already used by the edit page. Save the public URL to `logo_url`.
- Map icon: pure SVG `divIcon` (no new asset import) so no bundler/asset wiring needed. Use the Lucide `fuel` path inlined.

## Out of scope

- No admin moderation changes, no business-detail page redesign, no new columns on `businesses` (everything fits in tags + existing `logo_url`).
- Charging stations as a separate `business_type` is not added — operators that are pure EV chargers can still sign up under `fuel_station` and tick only EV-charging tags. Happy to split into a dedicated `ev_charging` type later if you prefer.
