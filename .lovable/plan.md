## Goal
Expand the "Manage" panel on `/admin/sales-reps` into a full admin dossier for the selected rep: their user info, editable territories, richer analytics, and a per-referred-user breakdown of spend and commission split.

## Layout change (RepDetailSheet)
Widen the Sheet to `sm:max-w-3xl` and replace the flat sections with tabs:

1. **Overview** — profile fields (title, bio, public email/phone, photo, accepting/active toggles) — same form as today. Adds a read-only "Account" card at top: rep's full name, email, phone, city/region, joined date, roles, last sign-in, verification badges. Sourced from the existing `adminGetUserDossier` server fn (already used by `user-dossier-dialog`).
2. **Territories** — current `TerritoryEditor`. If none exist, show a clear empty state with the same add form inline (already supported; just surface the CTA when list is empty).
3. **Analytics** — expanded Quick Stats grid (window selector: 7/30/90/365d, default 30d):
   - Active accounts, Territories count, Open follow-ups
   - Signups in window, QR scans, Redemptions
   - Attributed revenue (₱), Estimated commission (₱), Estimated payout owed (unpaid)
   - Small sparkline-free "trend" list: signups per week for the window (bar list, no new chart lib)
4. **Referred users** — table of every user attributed to this rep (via `staff_referrals` → `referral_redemptions` and `sales_rep_assignments` where `source='referral'`), columns:
   - User (name + email, links to `/admin/users?q=…`)
   - Signed up on
   - Redemptions count
   - Total spent (sum `final_amount_php`)
   - Commission rate (%)
   - Commission earned (₱)
   - Status (paid / unpaid — derived, see Technical)
   Sortable by spent/earned; CSV export button.
5. **Connections** — read-only list of the rep's other app links: businesses they own/manage, listings count, clubs, partner-program partner row (if any), open support tickets count, recent audit entries touching this user. Each item links to the relevant admin page.

## Technical details

### New server function
`adminGetRepDetail({ rep_user_id, days })` in `src/lib/sales-rep.functions.ts`:
- Reuses `requireAdmin`, `supabaseAdmin`.
- Returns:
  - `account`: profile row + auth email/phone/last_sign_in_at/created_at + roles array
  - `stats`: same shape as `getMyRepStats` but scoped to `rep_user_id`, plus `signupsByWeek: {weekStart, count}[]`
  - `referredUsers`: for each `staff_referrals` row belonging to this rep, join `referral_redemptions` grouped by `user_id`; enrich with `profiles`. Fields: user_id, name, email, signed_up_at, redemptions, spent_php, commission_rate, commission_php.
  - `connections`: counts + small samples of businesses owned/managed, listings, clubs, partner_program_partners row, open support_tickets, last 10 admin_audit_log entries where subject = this user.

### Commission model (no schema change)
Sales reps don't have a dedicated commission table today. Use a single site-wide default rate from `site_settings` (key `sales_rep_commission_rate`, default `0.10`) applied to `final_amount_php`. Per-user override optional via `sales_rep_profiles.commission_rate_override` (nullable numeric) — added in a small migration; if null, fall back to site default. "Estimated commission" and "payout owed" are computed on read; nothing is auto-persisted. A clear "Estimated" label appears on all commission figures. Actual payout tracking (marking as paid) is out of scope for this task and called out in the UI.

### Migration
- `ALTER TABLE sales_rep_profiles ADD COLUMN commission_rate_override numeric NULL CHECK (commission_rate_override >= 0 AND commission_rate_override <= 1);`
- Upsert `site_settings` row for `sales_rep_commission_rate` = `0.10` if missing.

### Client wiring
- Add `commission_rate_override` to the `adminSaveRepProfile` input + Overview form (small numeric input, "leave blank to use site default").
- New `useQuery(["admin-rep-detail", repUserId, days])` inside `RepDetailSheet`, disabled until `repUserId` is set.
- CSV export builds client-side from `referredUsers`.
- Empty states everywhere ("No referrals yet", "No connections", "No territories — add one below").

### Non-goals
- No new charts library.
- No commission-payment tracking table (called out as future work).
- No changes to `/admin/users`, `/admin/audit`, or the rep-facing pages.

```text
Sheet (sm:max-w-3xl)
├── Header: name + email + role chips
└── Tabs
    ├── Overview     → Account card + Profile form (+ commission override)
    ├── Territories  → TerritoryEditor (with empty-state add form)
    ├── Analytics    → KPI grid + weekly signups bar list + window selector
    ├── Referred     → table + CSV export
    └── Connections  → businesses / listings / clubs / partner / tickets / audit
```
