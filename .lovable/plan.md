
## Goal

Replace every user-facing Google Maps render with OpenStreetMap via Leaflet. Leave admin-only server-side Google Places usage (business discovery, seeding, reverse-geocode fallback) alone.

## Scope of changes

### 1. Businesses map (routes: `map.tsx`, `businesses.index.tsx`, `businesses.$slug.tsx`)
- Replace `GoogleBusinessMap` with a new `BusinessMap` built on `react-leaflet` (Leaflet is already in the project via `location-picker-inner` and `business-map-inner`).
- Reuse the existing `business-map-inner.tsx` OSM scaffolding; extend it to accept the `GMapBusiness[]` shape (marker color by type, popup with name/rating/link, bounds-to-fit, click handler).
- Preserve the current UX: colored pins per business type, click-to-open drawer/sheet, "recenter", cluster-optional (skip clustering v1 unless trivial).

### 2. Parts / browse listings map (`components/marketplace/listings-map-view.tsx`)
- Rewrite the Google JS SDK load + `new google.maps.Map` block using Leaflet: `MapContainer`, `TileLayer` (OSM tiles), `Marker` per listing with popup linking to the listing page, `fitBounds` on markers.

### 3. Tow request pin picker (`components/towing/tow-map-pin.tsx`)
- Rewrite as a Leaflet map with click-to-place / drag marker, emitting the same `MapPinValue` `{lat, lng}` shape. Include a small "use current location" button (browser geolocation) to match today's behavior.

### 4. Cleanup
- Delete `google-business-map.tsx`, `google-business-map-inner.tsx`.
- Move `haversineKm` and `colorForType` out of `google-maps-loader.ts` into a new `src/components/businesses/map-utils.ts`; update imports in `map.tsx`, `businesses.index.tsx`, `google-business-map-inner`'s former callers.
- Delete `google-maps-loader.ts`.
- Remove the "Enlarge Google Maps built-in controls" block in `src/styles.css` (Leaflet has its own control styles already handled by `leaflet/dist/leaflet.css`).
- Do NOT touch `admin.location-corrections.tsx`'s "Open in Google Maps ↗" link — that's just a `maps.google.com` deep link, not a map render, and is useful as an external reference.
- Do NOT touch admin Google Maps URL field in `admin.parts.outreach.tsx` (data field, not a map).

### Out of scope (intentionally left alone per user answer)
- `src/lib/places.server.ts`, `business-discovery-sync.*`, `business-seed.functions.ts`, `tow-geo.functions.ts` — server-side Google Places / Geocoding stays.
- `GOOGLE_MAPS_API_KEY` env var and the Google Maps Platform connector remain linked for those server functions.
- Google Fonts preconnect in `__root.tsx` (fonts, not maps).

## Technical notes

- All new maps use OSM tile URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution `&copy; OpenStreetMap contributors`, matching the existing `business-map-inner` and `location-picker-inner`.
- Every Leaflet map is imported dynamically (`ClientOnly` / `lazy` + `Suspense`) to avoid SSR "window is not defined" — same pattern already used in `business-map.tsx` and `location-picker.tsx`.
- Marker icon assets: import from `leaflet/dist/images/*` and override `L.Icon.Default.mergeOptions` once, or use a small inline `divIcon` with a colored dot for business-type pins (matches current `colorForType`).
- No new dependencies needed — `leaflet` and `react-leaflet` are already installed.

## Verification

After changes:
- `bun run build` succeeds.
- `/map`, `/businesses`, `/businesses/[slug]`, `/parts`, `/browse/[category]`, and the tow request form all render maps with OSM tiles and no `maps.googleapis.com` network requests in the browser.
- Existing tests (`bun run test`) still pass.
