# Sales Rep System for 365 Motor Sales Staff

Turn Joan and other `sales`-role staff into proper Sales Reps with territories, an assigned book of business, a CRM-style dashboard, and a customer-facing rep card.

## Data model (new tables)

```text
sales_rep_profiles       one row per staff sales rep
  user_id (FK profiles, unique)        active, title, bio
  photo override, public email/phone   accepting_new_clients flag

sales_rep_territories    rep's coverage
  rep_user_id, region, province, city  (city/province nullable = whole region)
  is_primary

sales_rep_assignments    who Joan owns
  rep_user_id
  subject_type ('user' | 'business')
  subject_id (uuid)
  source ('referral' | 'manual' | 'territory' | 'customer_choice')
  assigned_at, assigned_by, notes
  active                               unique(subject_type, subject_id) where active

sales_rep_followups      per-customer follow-up log (the "Other" answer)
  rep_user_id, subject_type, subject_id
  kind ('note'|'call'|'email'|'sms'|'meeting'|'request')
  status ('open'|'done'|'snoozed')
  title, body, due_at, completed_at, created_at
```

RLS:
- Rep sees own rows; admins see all.
- Customers can SELECT their assigned rep's public card (via security-definer fn returning safe columns only — no internal notes).
- Reassignment writes audit row in `admin_audit_log`.

Auto-assignment (DB triggers + server fn):
1. **Referral** — on `user_referrals` insert, if `referred_by_staff_id` maps to a `sales` rep, create assignment (source=`referral`).
2. **Manual** — admin UI writes directly.
3. **Territory** — server fn `assignRepByTerritory(subject)` runs on profile/business save when no active assignment exists; picks rep whose territory matches `region`+`city`, ties broken by lowest active load.

## Server functions (`src/lib/sales-rep.functions.ts`)

- `getMyRepProfile` / `saveMyRepProfile` (rep self-service)
- `listMyTerritories` / `upsertMyTerritory` / `removeMyTerritory`
- `listMyAssignments({ type, q, page })` — Joan's book of business
- `getMyRepStats({ range })` — signups, conversions, revenue from `referral_redemptions`, QR scans, active leads
- `listMyFollowups({ status })` / `createFollowup` / `updateFollowup` / `completeFollowup`
- `getAssignedRep({ subjectType, subjectId })` — used by customer rep card
- Admin: `adminListReps`, `adminAssignRep`, `adminReassign`, `adminBulkAssignByTerritory`

All protected with `requireSupabaseAuth`; admin variants gated by `has_role(uid,'admin')`.

## UI

### Rep (Joan) — new section under `/dashboard`
- `dashboard.rep.tsx` — overview: KPIs (signups this month, active accounts, open follow-ups, commissions), recent activity
- `dashboard.rep.accounts.tsx` — assigned users + businesses, filters (status, region, source), row → drawer with profile, contact, follow-ups, message thread
- `dashboard.rep.followups.tsx` — kanban/list: Open / Snoozed / Done, due-date sorting, quick-add
- `dashboard.rep.territories.tsx` — multi-select regions + (optional) provinces/cities
- `dashboard.rep.analytics.tsx` — date-range chart: signups, conversions, redemptions, QR scans

### Admin — `/admin/sales-reps`
- List reps with active accounts count, territories, last activity
- Drawer: edit profile, territories, assign accounts, deactivate
- Bulk territory backfill button

### Customer-facing rep card
- Component `RepCard` (photo, name, title, "Your 365 rep", Message + Email + Call buttons)
- Render on `/dashboard` overview and on the owner's business page header (owner view only)
- Uses `getAssignedRep` server fn

## Wiring existing data

- `staff_referrals` already keyed to `staff_user_id` — preserved; on first redemption or signup, auto-create `sales_rep_assignments` row.
- `leads` already org-scoped — leave as-is, but `sales_rep_followups` is rep-scoped per assigned account (different concept).
- `messages` reused for rep ↔ customer chat (rep card "Message" opens existing thread UI).

## Out of scope (for this pass)
- Commission/payout calculations beyond reading existing `referral_redemptions` totals.
- Customer-initiated rep reassignment (you picked "show card", not "let them switch").
- Cross-rep handoff workflow.

## Phasing
1. Migration: tables + RLS + triggers + indexes.
2. Server functions + admin assignment UI.
3. Rep dashboard pages (accounts, follow-ups, territories, analytics).
4. Customer-facing RepCard on dashboard + business page.
5. Backfill: assign Joan's existing referrals + offer admin bulk-by-territory.

Approve and I'll start with Phase 1 (migration).
