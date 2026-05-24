## Problem
The map page already syncs `lat`, `lng`, `r`, `type`, and `q` to the URL via `navigate({ replace: true })`. However, when a user revisits `/map` **without** those URL params (e.g. clicking the nav link again), their last searched location and radius are lost — the map resets to a blank state.

## Solution
Add a `localStorage` fallback layer so the last-used location and radius survive across sessions when the URL doesn't contain them.

1. **Write to localStorage** whenever `center` or `radiusKm` changes (debounced or immediate is fine — the object is tiny).
   - Key: `map:last-search`
   - Value: `{ lat, lng, label?, radiusKm }`

2. **Read from localStorage on mount** only when the URL has **no** `lat`/`lng` params.
   - If `search.lat` and `search.lng` are present → trust the URL (current behavior).
   - If missing → try `localStorage.getItem('map:last-search')` and restore `center` + `radiusKm`.

3. **Keep URL sync unchanged** — URL remains the primary source of truth when present. This way a shared/bookmarked URL still works exactly as before.

4. **Clear localStorage** when the user explicitly clears the location (the "X" button in the filter bar), so stale searches don't haunt them.

## Files
- `src/routes/map.tsx` — add localStorage read on mount, write in effect, and pass a `onClear` signal to clear storage.

## Out of scope
- No changes to UI layout, map controls, bottom sheet, or filter bar styling.
- No database or auth changes.