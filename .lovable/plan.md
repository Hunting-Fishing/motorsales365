## Step 7 — Proxy Nominatim through a server function

Move all browser-side calls to `nominatim.openstreetmap.org` behind our own server, so we control the User-Agent, rate-limit, and cache (OSM's usage policy requires a descriptive UA and forbids heavy unattributed client traffic).

### Changes

1. **New public server route** `src/routes/api/public/geo-search.ts`
   - `GET /api/public/geo-search?q=...&limit=7`
   - Validates `q` (2–200 chars) and `limit` (1–10).
   - Calls Nominatim `/search` with `countrycodes=ph`, `viewbox=116.0,4.5,127.0,21.5`, `bounded=1`, `addressdetails=1`, sets `User-Agent: 365MotorSales/1.0 (...)`.
   - Maps results to a small DTO `{ id, primary, secondary, lat, lng, label }`.
   - Returns JSON with `Cache-Control: public, max-age=300`.
   - Mirrors the same shape as existing `/api/public/geocode` (single-result) but for autocomplete.

2. **Update `src/components/businesses/places-autocomplete.tsx`**
   - Replace the direct `fetch("https://nominatim.openstreetmap.org/search…")` with `fetch("/api/public/geo-search?q=…&limit=7")`.
   - Drop the client-side URL building / viewbox params (now server-owned).
   - Keep the existing 350ms debounce, abort-controller, and keyboard handling untouched.
   - Simplify the response mapping since the server already returns `{ primary, secondary, ... }`.

### Out of scope
- Map clustering, geolocation button (done in step 6).
- Admin Places import flow already uses `places.server.ts` server-side — no change.
- No DB changes, no new secrets.

### Files touched
- `src/routes/api/public/geo-search.ts` (new)
- `src/components/businesses/places-autocomplete.tsx` (edited)
