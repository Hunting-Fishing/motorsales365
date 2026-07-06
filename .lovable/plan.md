## Goal

Turn the Admin Overview cards into deep links so admins can drill from any KPI into the underlying rows, pre-filtered to the window (today / 7d / 30d) they clicked.

## Changes

### 1. `src/routes/admin.index.tsx` — make cards linkable

- Convert `SnapshotCard`, `WindowCard`, `RevenueCard`, and `TopReferrerList` rows from plain `<div>`s into `<Link>`s (keep current visuals; add hover state consistent with `HealthCard`).
- `WindowCard` / `RevenueCard` render one link per triplet cell (Today / 7d / 30d) so each window is its own destination.
- Wire destinations:
  - **Top 365 staff / Top partners rows** → `/admin/sales-reps?rep=<code>` (jumps to that rep's detail).
  - **New signups (window)** → `/admin/accounts?range=today|7d|30d&sort=signup_desc`.
  - **Total users / Verified sellers / Active accounts / Founding members** → `/admin/accounts` with the matching filter (`verified=1`, `active=1`, `founding=1`).
  - **QR scans (window)** → `/admin/referrals?range=…`.
  - **Signups via referral (7d)** → `/admin/referrals?range=7d&signups=1`.
  - **Listings created (window)** → `/admin/listings?range=today|7d|30d`.
  - **Active listings** → `/admin/listings?status=active`.
  - **Listings awaiting payment** → `/admin/listings?status=pending_payment`.
  - **Boosts sold (window)** → `/admin/payments?kind=boost&range=…`.
  - **Revenue (paid) window cells** → `/admin/payments?status=paid&range=today|7d|30d`.
  - **Revenue — all time** → `/admin/payments?status=paid`.
  - **Messages sent** → no admin messages route today; keep non-clickable (call this out).

### 2. Destination routes — accept the search params and apply filters

For each destination, add `validateSearch` (zod) that parses the new params and wires them into the existing query/filter state so the page opens already filtered. Keep current UI; only pre-seed filters + add a small "Filtered from Overview: <label> — clear" chip that clears the search params.

- **`src/routes/admin.sales-reps.tsx`** — extend existing `validateSearch` (already reads `q`) to also read `rep` and, when present, open the rep detail drawer/tab for that referral code on mount.
- **`src/routes/admin.accounts.tsx`** — add `validateSearch` for `range`, `verified`, `active`, `founding`, `sort`; apply to the existing list query.
- **`src/routes/admin.listings.tsx`** — add `validateSearch` for `range` and `status`; apply to the listings query.
- **`src/routes/admin.payments.tsx`** — add `validateSearch` for `range`, `status`, `kind`; apply to the payments query.
- **`src/routes/admin.referrals.tsx`** — add `validateSearch` for `range` and `signups`; apply to the scans/signups query.

`range` helper (shared in `src/lib/date-range.ts`) returns `{ from, to }` for `today | 7d | 30d` in the app's timezone; destinations use it uniformly.

### 3. No backend changes

All numbers on Overview already come from `admin_overview()`; the destination pages already query the same underlying tables. This work is purely routing + client-side filter wiring — no migrations, no RPC changes.

## Out of scope

- Building a new "admin messages" route (Messages sent card stays non-clickable).
- Redesigning the destination pages; only their filter inputs get pre-seeded.
