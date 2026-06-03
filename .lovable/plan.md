## Step 8 — Bundle Leaflet marker icons locally

Replace the runtime `https://unpkg.com/leaflet@1.9.4/dist/images/*` URLs with ESM asset imports from the installed `leaflet` package. This removes an external runtime dependency (faster, works offline / behind firewalls / in CSP-strict setups) and avoids broken markers if unpkg is unavailable.

### Changes

1. **`src/components/businesses/business-map-inner.tsx`**
   - Replace the 3 `unpkg.com` string constants with:
     ```ts
     import iconUrl from "leaflet/dist/images/marker-icon.png";
     import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
     import shadowUrl from "leaflet/dist/images/marker-shadow.png";
     ```
   - `L.icon({ iconUrl, iconRetinaUrl, shadowUrl, ... })` stays the same.

2. **`src/components/businesses/location-picker-inner.tsx`** — same swap.

3. **`src/components/admin/device-heatmap-inner.tsx`** — verify it already uses local CSS only; only edit if a marker icon is constructed.

### Out of scope
- No dependency add (`leaflet` is already installed).
- No DB / route / behavior changes.
- `google-business-map.tsx` uses custom DivIcons (colored pins), not the default Leaflet marker — no edit.

### Files touched
- `src/components/businesses/business-map-inner.tsx`
- `src/components/businesses/location-picker-inner.tsx`
