# Phase 2B — Dealer SaaS

Build multi-staff dealer tools on top of the existing `organizations` + `organization_members` infrastructure.

## What's already in place

- `organizations`, `organization_members` (roles: owner/admin/…), `organization_invites`
- `listings.organization_id` already exists
- Helper fns: `is_org_member`, `can_manage_org`, `org_role`, `tg_org_add_creator_as_owner`
- `messages` (listing inquiries), `service_inquiries`, `tow_requests` exist but are user-scoped, not org-scoped

## Scope of this pass

### 1. Database migration

- **Add `organization_id`** (nullable, FK) to `businesses`.
- **`leads`** table — unified inbox:
  - `id`, `organization_id`, `source` enum (`listing_message`, `business_inquiry`, `service_inquiry`, `tow_request`), `source_id`, `listing_id?`, `business_id?`
  - `customer_user_id?`, `customer_name`, `customer_email?`, `customer_phone?`
  - `subject`, `preview` (first 280 chars)
  - `status` enum (`new`, `in_progress`, `won`, `lost`)
  - `assigned_to?` (FK profiles), `assigned_at?`
  - `last_activity_at`, `created_at`, `updated_at`
  - Unique `(source, source_id)` to dedupe.
- **`lead_activities`** — append-only audit + notes timeline:
  - `lead_id`, `actor_id`, `kind` (`created`, `assigned`, `status_changed`, `note`, `reply_sent`), `from_value?`, `to_value?`, `body?`, `created_at`.
- **Triggers** auto-create leads:
  - On `messages` insert where recipient owns a listing tied to an org → create/update lead (source=`listing_message`).
  - On `service_inquiries` insert tied to a business with `organization_id` → lead.
  - On `tow_requests` insert where provider listing belongs to an org → lead.
- **RLS**:
  - `leads` SELECT/UPDATE: org members (any role) of `organization_id`.
  - `lead_activities` SELECT: org members; INSERT: org members for their org's leads.
- Status-change + assign trigger writes `lead_activities` row automatically.

### 2. Server functions (`src/lib/leads.functions.ts`)

- `listOrgLeads({ orgId, status?, assignedTo?, source?, q? })`
- `getLead({ id })` (lead + activities + members for the assign dropdown)
- `assignLead({ id, userId | null })`
- `updateLeadStatus({ id, status })`
- `addLeadNote({ id, body })`
- `getOrgPerformance({ orgId, since? })` → per-member counts of new/in_progress/won/lost + win-rate.
- `listMyOrgs()` → orgs the current user belongs to (for org switcher).

All use `requireSupabaseAuth`; org membership enforced by RLS + explicit `is_org_member` checks where we touch related tables.

### 3. UI routes (under `_authenticated/dashboard/team/`)

- `team.tsx` (layout w/ org switcher + tabs: Leads / Members / Performance)
- `team.leads.tsx` — inbox table: status pills, source icons, assignee avatar, filters, search
- `team.leads.$id.tsx` — drawer/page: customer details, source link, status dropdown, assignee dropdown, activity timeline, "Add note"
- `team.members.tsx` — current members + roles; invite by email (reuses `organization_invites`); promote/demote owner-only
- `team.performance.tsx` — table of reps with new/in-progress/won/lost + win-rate, 30-day range

Add a **Team** entry in the dashboard sidebar visible when the user belongs to ≥1 org.

### 4. Polish

- Dashboard home shows a "Team inbox: N new leads" card when the user is in an org.
- When a sales rep replies via the existing message thread on a listing inquiry, the trigger writes a `reply_sent` activity (so we get rep attribution).

## Out of scope (next passes)

- Multi-org per-listing assignment UI (we already have `listings.organization_id`; just expose it in the listing form).
- Business → org binding UI for legacy businesses (will add a dropdown in `dashboard.businesses` to attach to an org after this migration lands).
- Email/SMS notifications to assigned rep — relies on existing `enqueue_email` pipeline; add in next pass.

## Technical notes

- Lead dedup via `UNIQUE (source, source_id)` + `ON CONFLICT DO UPDATE SET last_activity_at = now()`.
- For `listing_message` source, `source_id` = the listing thread key `LEAST(sender,recipient) || '|' || listing_id` so all messages in a thread roll up into one lead.
- Assign + status changes go through server functions so we can write `lead_activities` in the same transaction.
- Realtime: enable on `leads` so the inbox updates live.
