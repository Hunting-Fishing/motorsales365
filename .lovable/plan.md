# Mobile-friendly Map UI

The `/map` page currently uses very small chips (`px-3 py-1 text-xs`, ~24 px tall), radius pills (~20 px), and a vertically stacked list under the map. Apple/Material guidance is 44 px minimum tap targets, and the current map feels desktop-first on a 360 px screen.

## Changes

### 1. `src/components/businesses/map-filter-bar.tsx` — bigger, swipe-scrollable controls
- **Type chips**: turn the `flex flex-wrap` row into a horizontal **swipeable strip** on mobile (`overflow-x-auto snap-x snap-mandatory -mx-3 px-3 [scrollbar-width:none]`, items `snap-start shrink-0`), keep wrap on `sm:`. Bump each chip from `px-3 py-1 text-xs` to `min-h-11 px-4 py-2.5 text-sm` on mobile, `sm:min-h-9 sm:py-1.5 sm:text-xs`. Active chip gets a subtle shadow so it's obvious during scroll.
- **Search + "Use my location"**: stack full-width on mobile (`grid grid-cols-1 sm:flex`), make the location button `size="lg"` mobile-only (44 px tall), with the crosshair icon enlarged. PlacesAutocomplete input gets `h-11 text-base` on mobile to avoid iOS zoom.
- **Radius row**: also a swipeable snap strip on mobile; each `km` pill becomes `min-h-10 min-w-12 px-3 text-sm`. Clear button becomes a full-tap-area icon-button (`h-10 w-10`) instead of inline text.
- Add `aria-pressed` to all toggle chips for a11y.

### 2. `src/routes/map.tsx` — swipe-up bottom-sheet list on mobile
- Replace the stacked map → list layout on mobile with: map fills `h-[calc(100dvh-180px)]` and a **draggable bottom sheet** sits over it with three snap points (peek ~88 px, half ~50dvh, full ~85dvh). Drag handle bar at top (`h-1.5 w-12 rounded-full bg-muted`).
- Implementation: Framer Motion `<motion.div drag="y" dragConstraints dragSnapToOrigin={false}>` with snap points computed from viewport height; or a lightweight controlled `transform: translateY()` driven by pointer events. Tap the handle to cycle states. Keep `lg:` layout unchanged (side-by-side grid).
- Result list inside the sheet: cards bumped from `p-3` to `p-4` with `min-h-16`, title from `text-sm` to `text-base`, meta from `text-[11px]` to `text-xs`. Whole card already a tap target; add `role="button"` + keyboard handler.
- Result count + "X within Y km" line becomes a sticky header at the top of the sheet so it stays visible while scrolling cards.

### 3. `src/components/businesses/google-business-map.tsx` — touch-friendly map controls
- Pass `gestureHandling: "greedy"` to the Map so a single-finger drag pans instead of showing the "use two fingers" overlay. Enable `clickableIcons: false` to keep our pins primary. Hide `mapTypeControl` and `streetViewControl` on small screens (set on init based on `window.innerWidth < 768`), keep zoom buttons but enlarge via CSS override (`.gm-bundled-control button{width:44px;height:44px;}`).
- Pin marker: bump default size (`scaledSize`) ~20% on touch devices so it's easier to tap.

## Out of scope
No data, route, or auth changes. Desktop (`lg:`) layout unchanged except for control sizing inheritance.

## Verification at 360×644
- Type filter strip scrolls horizontally with momentum and snaps; every chip ≥44 px.
- Search field doesn't trigger iOS zoom.
- Radius pills swipeable and ≥40 px tall.
- Bottom sheet draggable between peek/half/full; map remains pannable with one finger.
- Result cards ≥64 px tall, easy to tap without mis-hitting neighbors.
