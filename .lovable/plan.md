## Goal

Kill the hydration crash on `/map` and confirm the tablet/desktop side-by-side layout is intact.

## Root cause

The `/map` route mounts a lot of state that only exists on the client (localStorage-restored `selectedSlug` / `viewport`, `types` populated in a `useEffect`, geolocation, Leaflet-lazy children). React's SSR HTML and the first client render can diverge in subtle ways (conditional "Clear selection" Button, Select items list, Legend collapsed state) — the browser reports the mismatch on a Button node inside `MapPage`, and the whole subtree re-renders from scratch, which is what triggers the "map overlays the list" flash the user sees.

The reliable fix is to render a **stable, minimal SSR shell** for `/map` and only mount the real interactive page after hydration. The map is client-only anyway (Leaflet), so there is no SEO cost — the route already has correct `head()` metadata.

## Changes

### 1. `src/routes/map.tsx` — hydration-safe boundary

- Add a small `useHydrated()` gate at the top of `MapPage`.
- Before hydration, return a lightweight placeholder inside `<SiteLayout>`:
  - The `<h1>` + subtitle (identical to what SSR already renders).
  - A neutral `Card` skeleton for the filter bar.
  - A grid container matching the real layout (`md:grid md:grid-cols-[320px_minmax(0,1fr)]`) with a map-sized `Skeleton` on the right and a short list `Skeleton` stack on the left.
- After hydration, render the current full interactive tree unchanged.
- Move `readStoredSearch()` (localStorage) usage entirely into the post-hydration `useEffect` (already the case) — no state initializer touches it.
- Confirm no derived render uses `Date.now()` / `Math.random()` (none currently).

### 2. `src/routes/map.tsx` — layout confirmation (small polish only)

While in the file, verify and keep:
- Outer grid: `md:grid md:grid-cols-[320px_minmax(0,1fr)] md:gap-4 xl:grid-cols-[380px_minmax(0,1fr)]`.
- Map cell: `order-1 md:order-2`, capped height so the sidebar (`md:order-1`) sits **left** of the map on tablet/desktop.
- Mobile bottom sheet unchanged.

No other files need changes. `MapLegend`, `MapFilterBar`, `MapBottomSheet`, and `BusinessesMap` remain as-is; the hydration gate at the page level covers them.

## Verification

- Load `/map` with `?lat=…&lng=…&r=50&q=My+location` in the preview.
- Confirm: no "Hydration failed" error in the console, no `preview_iframe_stuck_recovery_exhausted`, results list sits to the left of the map on ≥768px, mobile bottom sheet still works.

## Technical notes

- `useHydrated()` is already used elsewhere in the project (see `tanstack-execution-model` guidance). If a shared hook exists, reuse it; otherwise inline a 3-line `const [h,setH]=useState(false); useEffect(()=>setH(true),[]); return h;`.
- SSR skeleton must render the same DOM shape as the SSR HTML for the wrapping `<h1>` and container `<div>`s so those specific nodes don't flip — only the deep interactive parts are swapped from Skeleton → real UI on client mount.
