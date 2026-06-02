# Tackle remaining ESLint warnings

Goal: drive the non-`any` warning count to zero. ~63 warnings across two rules.

## 1. `react-refresh/only-export-components` (42 → 0)

### 1a. Scope the rule via ESLint overrides
`eslint.config.js` — add an override block that turns the rule off for files where it's a false positive:

- `src/components/ui/**` — shadcn primitives (co-exported `cva` variants by design)
- `src/lib/email-templates/**` — server-rendered React, never HMR'd
- `src/router.tsx` — framework config file

This clears ~33 of the 42 warnings.

### 1b. Fix the ~9 genuine app-code violations
Real components that co-export helpers/constants. Split each into a sibling file:

- `src/components/brand-logo.tsx` — extract `logoSrc` helper to `brand-logo.utils.ts`.
- `src/components/business/service-catalog-picker.tsx` (3 hits) — extract types/constants to `service-catalog-picker.types.ts`.
- `src/components/shop/shop-favorite-button.tsx` — extract co-exported helper.
- `src/components/signup/account-type-grid.tsx` — extract `SignupIntent` type + `SIGNUP_TYPES` constant to `account-type-grid.types.ts`.
- `src/hooks/use-auth.tsx` — extract co-exported constant/helper.
- `src/lib/currency.tsx` — extract helpers to `currency.ts` (the `.tsx` file keeps the JSX component).
- `src/lib/feature-flags.tsx` (3 hits) — extract `FeatureFlagKey` type + constants to `feature-flags.types.ts`.

Each extraction is mechanical: cut the non-component exports into a sibling file, add re-imports to the original, update import sites to either keep using the original (re-export from it) or import from the new sibling. I'll re-export to minimize call-site churn.

## 2. `react-hooks/exhaustive-deps` (21 → 0)

Per-site review of 21 effects/memos across 17 files. For each one:
- **Safe to add**: add the missing dep to the array.
- **Stable ref or one-shot init**: keep behavior, add `// eslint-disable-next-line react-hooks/exhaustive-deps` with a one-line reason.
- **Needs memoization**: wrap the dep in `useCallback`/`useMemo` if adding it would cause re-runs.

Files touched:
- `src/components/ads/ad-carousel.tsx`
- `src/components/businesses/google-business-map.tsx`
- `src/hooks/use-dynamic-jsonld.ts`
- `src/routes/admin.audit.tsx`, `admin.inquiries.tsx`, `admin.referrals.tsx`, `admin.reports.tsx`, `admin.users.tsx`
- `src/routes/dashboard.billing.tsx`, `dashboard.index.tsx`, `dashboard.messages.tsx`, `dashboard.searches.tsx`, `dashboard.tow.tsx`, `dashboard.verification.tsx`
- `src/routes/listing.$id.edit.tsx`, `login.tsx`, `shop.p.$slug.tsx`

No behavior changes — only dep-array tightening or documented suppressions.

## Verification

- `bunx tsc --noEmit` — must stay clean.
- `bunx eslint .` — target: 0 errors, ~1054 warnings (all `no-explicit-any`).
- Spot-check: login still redirects, admin pages still load, dashboard widgets still refresh.

## Files touched (estimate)

- `eslint.config.js` (override block added)
- ~8 new sibling files (`.types.ts` / `.utils.ts` extractions)
- ~25 files edited for dep arrays or co-export extractions
- 0 deletions, 0 moves
