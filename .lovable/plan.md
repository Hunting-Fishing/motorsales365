## Goal

Stop `/map` from jumping to the top when the user changes filters (radius, type, name, checkboxes).

## Root cause

`src/router.tsx` enables `scrollRestoration: true`. Every filter change on `/map` calls `navigate({ to: "/map", search: nextSearch, replace: true })` (map.tsx line 284). TanStack Router treats each such navigation as a new location entry and — because no scroll position is saved for the new key — resets scroll to 0. The SiteLayout scroll-to-main effect is not the culprit (it keys on pathname only), but the router's own scroll restoration is.

## Change

### `src/routes/map.tsx` (line ~284)

Add `resetScroll: false` to the URL-sync `navigate(...)` call so filter-driven URL updates keep the current scroll position:

```ts
navigate({ to: "/map", search: nextSearch, replace: true, resetScroll: false });
```

That's the only edit — one option on one call. No other files change.

## Verification

- Scroll `/map` down to the results list, change the radius from 1 km to 10 km, and confirm the viewport stays put.
- Repeat for type filter, name search, featured/verified toggles.
- Navigating away and back still lands at the top (unaffected — that path uses fresh navigation without `resetScroll: false`).
