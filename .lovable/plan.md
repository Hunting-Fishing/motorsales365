## Goal

Turn the current `/businesses` Leaflet map into a real "find businesses near me" experience powered by Google Maps, and add a full-screen `/map` page. Show pins for every approved business with type-based icons, radius search, and price/rate badges. Add a tool to import nearby places from Google to seed the directory (deduped against existing businesses).

## What you'll see

**Upgraded `/businesses` (list-first)**
- Current results list stays.
- Map panel switches from Leaflet to Google Maps (gated by the existing region filter).
- "Use my location" + radius slider (1, 5, 10, 25, 50 km). Pins outside the radius hide.
- Type filter chips (Dealership, Gas station, Parts, Repair, Tires, Towing, etc. — sourced from `business_types`).
- Pins colored by type; clicking opens a card with name, rating, city, and a price/rate badge when available.

**New `/map` (full-screen)**
- Header + footer trimmed; map fills the viewport.
- Left sidebar: search box (Google Places autocomplete for location), radius slider, type filter chips, list of visible businesses sorted by distance.
- Map: clustered pins, hover highlights the matching list row.
- Deep-linkable: `?lat=…&lng=…&r=10&types=fuel_station,dealership`.

**Admin: Import from Google Places (`/admin/businesses` → new "Import nearby" tab)**
- Pick a center point + radius + type.
- Calls Google Places (New) `searchNearby` through the connector gateway.
- Shows results with dedup status (matched by place_id or name+coords within 100m of an existing business).
- Admin selects which to import as `pending` business rows (owner_id null, source = "google_places", `source_external_id` = place_id).

## Data model changes

Add to `businesses`:
- `price_label` text — short rate/price shown on pin (e.g. "Diesel ₱58.20", "Oil change ₱1,200"). Optional, owner-editable.
- `price_updated_at` timestamptz.
- `source` text default 'manual' — 'manual' | 'google_places' | 'facebook'.
- `source_external_id` text — Google place_id when imported.
- Unique index on `(source, source_external_id)` where `source_external_id is not null` (dedup).

Existing `lat`, `lng`, `type_slug`, `status`, `rating_avg`, `featured` are reused.

## Technical details

**Connector**
- Use the existing Google Maps Platform connector (already documented in the prompt). Browser key `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` powers the Maps JS API + Places autocomplete in the browser. Server-side Places `searchNearby` and geocoding go through `https://connector-gateway.lovable.dev/google_maps` from a TanStack server function (`src/lib/places.functions.ts` + `places.server.ts`). If the connector isn't linked yet, I'll prompt with `standard_connectors--connect`.

**New files**
- `src/components/businesses/google-business-map.tsx` — wraps Maps JS API loader (`loading=async&callback=…`), renders `google.maps.Marker` per business, color by type, info windows with price badge. No `mapId` (per house rule).
- `src/components/businesses/map-filter-bar.tsx` — type chips + radius slider + "Use my location" + Places autocomplete (`AutocompleteSuggestion.fetchAutocompleteSuggestions`).
- `src/components/businesses/business-list-sidebar.tsx` — sorted-by-distance list for `/map`.
- `src/routes/map.tsx` — full-screen route; reads/writes query params for shareability; `head()` with proper title/description.
- `src/lib/places.functions.ts` + `places.server.ts` — server fns: `searchNearbyPlaces({lat,lng,radius_m,type})`, `importPlaces({place_ids})` (admin-gated via `has_role(admin)`).
- `src/components/admin/import-places-panel.tsx` — admin UI tab.

**Edited files**
- `src/routes/businesses.index.tsx` — swap `BusinessMap` for `GoogleBusinessMap`, add filter bar, apply haversine filter when radius is set.
- `src/routes/businesses.$slug.tsx` — same swap (single pin map).
- `src/components/site-header.tsx` — add "Map" nav link.
- `src/routes/admin.businesses.tsx` — add "Import nearby" tab.
- `src/lib/format.ts` — add `haversineKm(a, b)` helper.

**Dedup logic (server)**
- For each Google result: match if `source='google_places' AND source_external_id=place_id` OR there's a business within 100m whose normalized name matches (case-insensitive, strip punctuation). Mark as "already imported" vs "new".

**RLS / security**
- `businesses` policies are unchanged; `price_label`/`source*` updates allowed by existing owner/admin policies.
- Admin-only `importPlaces` server fn uses `requireSupabaseAuth` + role check.
- Public read of new columns is fine (no PII).

**Removed**
- Leaflet stays installed (still used in `location-picker-inner.tsx` for the submit form picker); only the public map components migrate to Google Maps. We can migrate the picker later if you want.

## Out of scope (ask separately if you want them)
- Mobile native geofencing/push.
- Owner-side bulk price update tool.
- Migrating `LocationPicker` submit form to Google Maps.
- Rating/review redesign on pin popups.

## Migration order
1. DB migration (new columns + index).
2. Confirm Google Maps connector linked (prompt if not).
3. Build `GoogleBusinessMap` + filter bar; swap into `/businesses` and `/businesses/$slug`.
4. Add `/map` full-screen route + sidebar.
5. Add admin import panel + server fns.
6. Add header nav link.
