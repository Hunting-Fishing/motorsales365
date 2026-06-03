# Remaining Issues After Phases 1–4

Audit of what's still incomplete, inconsistent, or outright broken. Grouped by severity.

## 🔴 High — functional gaps from prior phases

### 1. PaymentRails component is dead code
`src/components/checkout/payment-rails.tsx` was built in Phase 3.3 but is **not imported anywhere**. The Stripe-only checkout (`/listing/checkout`, `/boost/checkout`, `/business/checkout`) never renders it. Either:
- Mount it on the three checkout routes (read-only "Available methods" section), or
- Delete it and the rail metadata until a second rail actually ships.

### 2. Two feature-flag systems coexist and don't agree
- `src/lib/feature-flags.tsx` — legacy hard-coded React Context with keys `towing`, `referrals`, `multiCurrency`, `adsInquiry`, `boosts`, `messaging`, `verifications`. Used by `__root.tsx`, `admin.sandbox.tsx`.
- `src/lib/feature-flags.functions.ts` + `src/hooks/use-feature-flags.ts` — new DB-backed flags seeded with `payments.*`, `boost.escrow`, `subscriptions.annual`. Used by `admin.feature-flags.tsx` only.

The new admin UI toggles flags that no runtime code reads, and the legacy flags can't be toggled from the admin page. Pick one:
- **Option A (recommended)**: Migrate the 7 legacy keys into the `feature_flags` table (seed migration), switch consumers to `useFeatureFlag(key)`, delete `feature-flags.tsx`.
- **Option B**: Keep both, rename the admin route to `/admin/payment-flags` to make the split explicit.

### 3. `currency.functions.ts` uses `as never` cast
`update({ display_currency: data.code } as never)` — `display_currency` IS in `types.ts` now, so the cast is stale and silently hides type errors. Remove the cast.

### 4. Ride photo tables use `(supabase as any)` casts
`ride_photos` and `ride_service_log_photos` exist in `types.ts` (lines 3663, 3745) but `ride-photo-uploader.tsx` and `service-log-photo-uploader.tsx` still cast `supabase as any` for every query — leftover from before the tables were typed. Remove the casts; queries will type-check.

## 🟡 Medium — drift / scope leakage

### 5. Plan doc claims `preferred_currency` but code uses `display_currency`
`.lovable/plan.md` Phase 4.1 promises a `preferred_currency` column with a check constraint. The migration that shipped is `display_currency text` with no check constraint and a different name. Either update the plan doc or rename the column. The mismatch will bite the next audit.

### 6. a11y pass was narrow
Phase 4.2 only touched 4 files (`single-file-uploader`, `gallery-contact-tabs`, `hours-editor`, `add-user-dialog`). Scope said "custom components in `checkout/`, `admin/`, `dashboard/`". Untouched icon-only buttons remain in:
- `ride-photo-uploader.tsx`, `service-log-photo-uploader.tsx` (delete/cover buttons)
- `boost-dialog.tsx`, `business-plan-dialog.tsx`
- `mobile-tab-bar.tsx` (tab icons; verify aria-labels)
- `share-qr.tsx`, `listing-qr.tsx` (copy/download buttons)

### 7. Cron contract docs added to only 2 of N public hooks
`fx/refresh.tsx` and `hooks/refresh-lazada.ts` got the CRON CONTRACT block. `ops-alerts-digest.ts` is also cron-triggered and has no contract comment — same risk.

## 🟢 Low — known deferrals (Phase 5 candidates)

- 669 `as any` matches across 104 files (mostly justified — `regionCentroids`, leaflet `L as any`, generic event handlers).
- `src/lib/education.functions.ts:837` — `as any` in a payment-adjacent code path; Phase 3 scope said money paths must not use `as any`. Worth a look.
- No E2E / webhook tests (acknowledged Phase 5).
- No `scripts/audit-coverage.ts` (acknowledged Phase 5).
- PWA manifest screenshots (intentionally skipped).

## Proposed Phase 5

Order by ROI:
1. **Decide on feature-flag consolidation** (issue #2) — biggest source of confusion.
2. **Wire or delete PaymentRails** (issue #1).
3. **Remove stale casts** (issues #3, #4) — pure cleanup, no behavior change.
4. **Reconcile plan doc vs migration** (issue #5).
5. **Finish a11y sweep** on the 6 remaining components (issue #6).
6. **Add CRON CONTRACT to `ops-alerts-digest.ts`** (issue #7).
7. **Review `education.functions.ts:837` cast** (low risk but in money path).

No database schema changes required for any of these except optionally renaming `display_currency` → `preferred_currency` (issue #5) and seeding legacy flag keys (issue #2 Option A).

Approve to proceed, or tell me which subset to tackle.
