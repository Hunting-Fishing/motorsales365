# Fix remaining `react-hooks/exhaustive-deps` warnings

Per-site review of all 21 `react-hooks/exhaustive-deps` warnings across ~17 files. No behavior changes intended.

## Approach

For each warning, choose one of:

1. **Add missing dep** — when the dep is genuinely needed and stable (or already memoized).
2. **Wrap in `useCallback`/`useMemo`** — when adding a dep would cause re-runs because the value is recreated each render.
3. **Inline-disable with reason** — when the omission is intentional (e.g., mount-only effect, deliberately stale closure, or adding the dep would cause loops/extra fetches).

Default bias: add the dep when safe; suppress with a brief `// reason: ...` comment otherwise. Never silently auto-add across the board.

## Files to touch

Based on the prior audit, the 21 sites span:

- `src/components/ads/ad-carousel.tsx`
- `src/components/businesses/google-business-map.tsx`
- `src/hooks/use-dynamic-jsonld.ts`
- `src/routes/admin.*.tsx` (several)
- `src/routes/dashboard.*.tsx` (several)
- `src/routes/listing.$id.edit.tsx`
- `src/routes/login.tsx`
- `src/routes/shop.p.$slug.tsx`

I'll re-run `bunx eslint .` first to get the authoritative current list (counts may have shifted slightly after prior edits), then walk each one.

## Verification

- `bunx eslint .` → 0 errors, only the deferred `no-explicit-any` warnings remain.
- `bunx tsc --noEmit` → 0 errors.
- No functional/UI changes — pure lint hygiene.

## Out of scope

- The ~1,054 deferred `no-explicit-any` warnings remain as warnings.
