## Goal

Every QR scan and referral-driven signup must be captured, attributed, and visible everywhere (admin overview, partner/staff drilldowns, rep manage view, referred users list). Today several code paths silently drop or mis-count them.

## Bugs found

1. **Sales-rep QR scan count always 0.** `src/lib/sales-rep.functions.ts` (lines ~232 and ~988) queries `qr_scans` by `staff_referral_id` and `created_at`, but the columns are `referral_code` and `scanned_at`. The query never matches, so every rep dashboard reports 0 scans.
2. **Referred users list misses signup-only users.** The drilldown is built only from `referral_redemptions` — a user who signed up via a QR code but never redeemed a discount never appears. `user_referrals` (which the DB trigger populates on every signup) is ignored.
3. **Admin Overview "Top staff / Top partners" signups column is wrong.** `admin_overview()` counts `referral_redemptions WHERE kind='signup'` for the signups column — that only counts users who *both* signed up *and* consumed a signup-bonus promotion. The screenshot's "10 SCANS / 0 SIGNUPS" is this bug. Should count from `user_referrals`.
4. **`partnerSignups7d` snapshot has the same bug** (also reads `referral_redemptions`). Should use `user_referrals`.
5. **QR posters don't tag scans as "qr".** All `/r/{code}` share URLs (poster page, admin qr-ads, referrals table, staff QR auth) are emitted without `?src=qr`, so `qr-landing-content.tsx` records every scan as `signup_source=link`. Verification tooling and reports that expect `signup_source='qr'` for poster/QR-origin signups will always show 0.
6. **Signup form doesn't force the code from `/r/{code}` deep links.** `useEffect` reads only the credited-code cookie; the poster/QR flow works fine when the user visits `/r/CODE` first (that page calls `recordTouch`), but a direct `?ref=CODE` on `/signup` isn't parsed as a fallback. Low priority but included for completeness.

## Fix plan

### A. Data-integrity fixes (server / SQL)

1. Replace `qr_scans` query in `getRepStats` and `adminGetSalesRepDetail` (`src/lib/sales-rep.functions.ts`) with the correct shape:
   `from("qr_scans").select("id", { count: "exact", head: true }).in("referral_code", refCodes).gte("scanned_at", since)`.
2. New migration `fix_qr_signup_attribution.sql` that rewrites `admin_overview()`:
   - `partnerSignups7d` → `SELECT count(*) FROM user_referrals WHERE created_at >= d7 AND referred_by_staff_id IS NOT NULL` (falls back to first_referral_code if staff link missing).
   - `topStaff.signups` and `topPartners.signups` → `count(*) FROM user_referrals ur WHERE (ur.credited_referral_code = s.referral_code OR ur.first_referral_code = s.referral_code) AND ur.created_at >= d30`. This surfaces every referred signup, credited or not.
3. In the same migration, expose a per-rep helper the drilldown can join on: keep queries in the app but make sure `user_referrals` has the indexes we already have on `first_referral_code`/`credited_referral_code` (already present per existing migrations — verify only, no schema change if present).

### B. Complete "Referred users" tab (rep drilldown)

In `adminGetSalesRepDetail` (`src/lib/sales-rep.functions.ts`):
- After building the `byUser` map from `referral_redemptions`, also fetch `user_referrals` rows for `refCodes` (`credited_referral_code IN (...) OR first_referral_code IN (...)`).
- Merge each referred user into `byUser` with `redemptions=0`, `spent_php=0`, `signup_only=true` when absent; keep spend fields when present.
- Enrich profile rows for the new user IDs (name/email/phone/city).
- Extend the table in `src/routes/admin.sales-reps.tsx` "Referred users" tab:
  - Add a "Source" column ("QR"/"Link"/"Direct") from `profiles.signup_source`.
  - Add a filter option "Signup only" alongside "With spend" / "No spend".
  - Update the totals row to include the total signup count (already-present spend/commission totals remain).
  - CSV export already reads the memoised list, so it picks up the new rows automatically.
- The existing drilldown drawer (`ReferredUserDrilldown`) already tolerates zero redemptions; verify the empty-state copy reads "No transactions yet — signup only".

### C. Overview payout breakdown correctness

`adminGetSalesRepOverview` uses the same referral-redemption source. Update the Overview tab's "per-user split" list to iterate the merged list so signup-only users appear with 0 commission and are counted in "referred users total" (they don't affect payout math but should be visible).

### D. QR-vs-link source tagging

Append `?src=qr` to every URL used for a printable/QR context so `qr-landing-content.tsx` records `signup_source=qr`:
- `src/routes/admin.advertisements.qr-ads.tsx` (line ~160 and poster preview)
- `src/routes/admin.referrals.tsx` (share/poster/CSV builders, lines ~289, ~626, ~886–887, ~1308, ~1355, ~1469)
- `src/lib/staff-qr-auth.functions.ts` (line 79)
- `src/components/share-qr.tsx` sample link
- Anywhere the QR image encodes the URL (share-qr and template preview)
Plain web share links (copy-link buttons that are not QR-encoded) stay as-is so `signup_source` stays "link".

### E. Signup form fallback

In `src/routes/signup.tsx`, extend the `useEffect` that loads `refCode` to also check `URLSearchParams` for `ref` / `r` / `code` and to persist via `recordTouch(code, srcParam === "qr" ? "qr" : "link")` before falling back to `getCreditedCode()`. This guarantees a direct `/signup?ref=CODE&src=qr` link is attributed even if cookies were blocked.

## Technical notes

- `user_referrals` is already populated by the `attach_signup_referral` trigger on `auth.users` insert, gated by Partner Program accreditation for the `credited_referral_code` column. Reporting on `first_referral_code OR credited_referral_code` captures *all* referred signups; commission-relevant reads keep using `credited_referral_code` only.
- No schema changes to `qr_scans`, `user_referrals`, `referral_redemptions`, or `profiles` — only a function rewrite + client-side query fixes + URL tagging.
- Migration file will follow the standard `CREATE OR REPLACE FUNCTION public.admin_overview()` shape and re-grant is unnecessary (function already exists).
- After migration, verify with a `supabase--read_query` sample: top partners for Dieter/Jocelyn should show non-zero signups if `user_referrals` rows exist.
