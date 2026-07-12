## Goal

Turn the `Map` view on `/browse/car` (and other browse categories + `/parts`) from a single map with a small "tap a pin" aside into a **smart split-view** matching `/map`:

- Left: scrollable list of listings for the current map viewport, sorted by distance from map center.
- Right: the Leaflet map with pins/clusters.
- Two-way sync: hovering/clicking a card highlights its pin; clicking a pin scrolls and highlights the card.

## Layout

```text
┌──────────────────────────────────────────────────────────┐
│  Toolbar (existing): results count · Legend · Grid | Map │
├───────────────────────┬──────────────────────────────────┤
│ N results in view     │                                  │
│ [sort ▾]              │                                  │
│ ┌─ card ────────────┐ │           Leaflet map            │
│ │ img · title       │ │   (pins + region clusters)       │
│ │ city · ₱price     │ │                                  │
│ └───────────────────┘ │        Legend · info             │
│ ┌─ card ────────────┐ │                                  │
│ ...  scrollable      │                                  │
└───────────────────────┴──────────────────────────────────┘
```

- Desktop: 380px list column + flex-1 map, height `min(75vh, 720px)`.
- Mobile: list stacks under the map, map fixed 55vh, list scrolls the page normally.

## Behavior

1. **Viewport-scoped list** — as the user pans/zooms, the list updates to show only listings whose pins fall in the current map bounds (plus a small padding).
2. **Sort by distance** from current map center. Secondary sort: newest.
3. **Header** shows "N results in view" + count of unmapped listings (link to switch to Grid).
4. **Hover a card** → its pin scales up + tooltip; **hover a pin** → its card gets a ring and scrolls into view (`scrollIntoView({ block: 'nearest' })`).
5. **Click a card** → map flies to the pin (`map.flyTo`) at zoom 14 and opens a small popup with title/price/CTA.
6. **Click a region-cluster pin** → map zooms to the region bounds; list narrows to that region's listings.
7. Unmapped-listings badge stays on the map (top-right).
8. Empty state when no pins in viewport: "Pan or zoom out to see listings."

## Files

- `src/components/marketplace/listings-map-view.tsx` — replace the current grid + tiny aside with the new split layout. Keep it lazy-loaded via the existing `listings-map-view.lazy.tsx` wrapper (no SSR change).
- New small child `MapViewportSync` (inside the same file) using `useMap` + `map.on('moveend', …)` to publish current `bounds` + `center` to parent state.
- New `ListingsSidePanel` sub-component (same file, small) for the scrollable card list; each card gets `data-listing-id` + `ref` for scroll-into-view.
- Reuse existing `ListingCard` — but render a **compact variant** (image left, 2-line meta right) to fit a 380px column. Add a `compact` prop to `ListingCard` or a lightweight local `CompactListingCard`. Prefer a local compact card to avoid touching the card's grid variant used elsewhere.
- No callers need to change; `ListingsMapView` prop shape stays `{ listings }`.

## Technical notes

- Use `L.LatLngBounds.contains` for viewport filtering.
- Distance sort: `map.distance(center, pinLatLng)` (meters, cheap).
- Two-way highlight via a shared `hoveredId` / `selectedId` state in `ListingsMapView`, passed to both the pin renderer (icon variant) and the side list (ring style).
- Keep the current city-level geocoding fallback and region-cluster logic; only the layout and the side panel change.
- Preserve pagination that lives in the parent route — the map view only re-renders when the page's `listings` array changes.

## Non-goals

- No changes to Grid view.
- No new server queries; still operates on the already-loaded page of listings.
- Not adding a radius/distance filter here — that lives on `/map`. This view is bounds-driven.
