## Goal
Tighten the listing sidebar and add an opt-in embedded map (Facebook Marketplace style).

## 1. Compact "Seller" sidebar card (`src/routes/listing.$id.tsx` ~L852-981)
- Reduce card padding `p-4` → `p-3`; drop the tricolor top bar height from `h-1` (keep but tighter margin).
- Shrink avatar `h-12 w-12` → `h-9 w-9`; heading `text-base sm:text-lg` → `text-sm`.
- Convert Call / WhatsApp / Message buttons from stacked full-width `default` size to `size="sm"` in a 2-col grid where possible; keep primary Call button full-width.
- Move QR + Tow it row to `size="sm"` with tighter icons.
- Trim vertical spacing (`space-y-2` → `space-y-1.5`, `mt-4` → `mt-3`).

## 2. Collapse "Need inspection or insurance" by default (~L993-1015)
- Change `<Collapsible defaultOpen asChild>` → `<Collapsible asChild>` (closed on load).
- Reduce internal padding via `ComingSoonSection` wrapper and shrink the grid to `grid-cols-2` with `text-xs` rows.

## 3. Collapse Buyer Document Checklist by default
- In `src/components/buyer-document-checklist.tsx`, change `useState(true)` → `useState(false)` so it renders collapsed.

## 4. Opt-in embedded map (like Facebook Marketplace)
- **Schema**: add attribute flag rather than new column — store `attributes.show_map_pin: boolean` on `listings`. No migration required (attributes is JSONB).
- **Sell form**: in the location step of `/sell` (location-picker area), add a checkbox "Show approximate location on a map on my listing" — writes to `attributes.show_map_pin`. Default: off. Only enabled when the user has pinned lat/lng.
- **Listing page**: new component `src/components/listing/listing-location-map.tsx` — thin Leaflet map (h-40 rounded-lg) rendered in the sidebar under the Seller card. Shows a single marker at `listing.lat/lng`. Adds a caption "Approximate area — {city}, {region}". Only renders when `listing.lat && listing.lng && listing.attributes?.show_map_pin === true`.
- Uses existing `react-leaflet` + OpenStreetMap tiles (already in the project via `tow-map-pin.tsx`); no new deps.
- Privacy: to avoid pinpointing a home address, jitter the marker by ~200m (round lat/lng to 3 decimals) before rendering.

## Out of scope
- No changes to messaging widget, safety checklist copy, or reporting.
- No DB migration — reuses `attributes` JSONB and existing lat/lng columns.

## Files touched
- `src/routes/listing.$id.tsx` (sidebar compaction, collapse coming-soon, mount map)
- `src/components/buyer-document-checklist.tsx` (default collapsed)
- `src/components/listing/listing-location-map.tsx` (new)
- `/sell` location step (add opt-in checkbox writing to `attributes.show_map_pin`)
- `/sell` edit path: same field surfaced for editing existing listings
