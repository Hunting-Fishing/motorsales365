# Parts Supplier Outreach & Onboarding Pipeline

Goal: turn the existing `parts_suppliers` table (already seeded with ~35 global + 16 PH-direct leads) into an actively worked sales pipeline so the 365 team can call, email, qualify, and convert suppliers into live partners feeding `/parts`.

## What we already have
- `parts_suppliers` (admin-only table, statuses for sign-up + API)
- `parts_supplier_applications` (full onboarding form + docs bucket)
- `/admin/parts` Suppliers tab (list/edit) and partner-applications tab
- `/partners/parts` public page + `/partners/parts/onboarding` form
- Affiliate click → conversion → commission pipeline live

What's missing is the **operational layer**: who's calling whom, when, what was said, what the next step is, and a dashboard the founder can run a Monday call-down from.

## Phase 1 — Outreach data model (migration)
New tables, all admin/staff-only:

1. `parts_supplier_contacts` — many contacts per supplier
   - role (owner, purchasing, parts_manager, ecom, ap, other)
   - name, title, phone, mobile, email, viber/whatsapp/messenger handle
   - preferred_channel, preferred_time, language, is_primary, do_not_contact

2. `parts_supplier_outreach` — every touch (call/email/visit/sms/viber)
   - channel, direction, outcome (no_answer, voicemail, gatekeeper, spoke, interested, not_interested, callback, meeting_set, quote_sent, won, lost)
   - duration_sec, summary, next_action, next_action_at, owner_user_id
   - linked optional: contact_id, application_id

3. `parts_supplier_tasks` — lightweight follow-ups (due_at, owner, status)

4. Extend `parts_suppliers` with operational columns:
   - `pipeline_stage` (lead → researched → contacted → qualified → pitched → negotiating → onboarding → live → lost)
   - `next_action_at`, `owner_user_id`, `last_contacted_at`, `lead_score` (0–100), `do_not_contact`, `lost_reason`
   - `address`, `city`, `province`, `google_maps_url`, `business_hours`

RLS: read/write limited to admins + a new `parts_ops` role (or reuse `sales`).
GRANT block on every new public table.

## Phase 2 — Outreach workspace UI
New route: `/admin/parts/outreach` with three views.

1. **Today** — call queue
   - All suppliers where `next_action_at <= today` OR `pipeline_stage in (researched, contacted)` and `last_contacted_at` is null/stale
   - Sort by `lead_score` desc, region PH first
   - One-click: Call (tel:), Email (mailto: with template), Open website, Log outcome

2. **Pipeline (Kanban)** — columns by `pipeline_stage`, drag-to-move, badge for overdue follow-ups

3. **Supplier detail drawer** — contacts list, outreach timeline, tasks, attached application, quick-add note. "Log a call" form sets next stage + next action in one submit.

## Phase 3 — Call-ready supplier profile
Enhance the Suppliers tab card with a "Call sheet" expander:
- Best phone + best time
- Pre-written PH-localized pitch script (3 variants: importer, retail chain, single-shop)
- Required info checklist (brands, fitment coverage, min order, payment terms, shipping nationwide, has feed/API, BIR/permit ready)
- Discovery questions list
- Objection handlers ("we already sell on Lazada", "we don't dropship", "we need exclusivity")
- One-click "Send onboarding link" → emails them `/partners/parts/onboarding` with their info pre-filled via a signed token

## Phase 4 — Email + reminder plumbing
- Outbound email helper that uses existing email infra; logs to `parts_supplier_outreach` automatically
- Two scheduled jobs (pg_cron → `/api/public/parts-ops/tick`):
  - Daily 8am PH: build today's call queue, notify owner
  - Hourly: surface overdue `next_action_at` as `ops_alerts`
- Unsubscribe + DNC honored on every channel

## Phase 5 — Seed real PH targets + research helpers
- Bulk-import a curated PH list (importers, chain stores, OEM distributors, junkyards) split across regions; pre-populate contacts where public
- Admin "Research" button on a supplier → opens Google Maps + FB Page + Lazada/Shopee storefront in tabs, and stores the URLs back on the row
- Duplicate detection on name + phone before insert

## Phase 6 — Reporting
`/admin/parts/outreach/reports`:
- Funnel (lead → live) with conversion %
- Activity per owner per week (calls, emails, meetings)
- Average days lead→live, win/loss reasons
- Live partners feeding `/parts` and clicks/commissions earned (joins existing affiliate tables)

## Out of scope (call out, don't build now)
- Twilio/3CX dialer integration — `tel:` links + manual logging only for v1
- Contract e-sign — keep manual upload for now
- Multi-tenant pipelines per BD rep — single shared pipeline, `owner_user_id` is enough

## Technical notes
- All new admin routes under `_authenticated/` + `has_role('admin')` or new `parts_ops` role check
- Server fns in `src/lib/parts-ops.functions.ts`; types regenerate after migration
- Two migrations: (1) schema + grants + RLS + role enum value if added, (2) cron + functions
- No edge functions — TanStack server fns for app-internal, single `/api/public/parts-ops/tick` route for cron with HMAC

## Suggested build order
1. Migration (Phase 1) + role grants
2. Outreach workspace skeleton (Phase 2 — Today view + log-call form)
3. Call sheet on supplier card (Phase 3)
4. Seed PH list + research helpers (Phase 5)
5. Pipeline kanban + reports (Phase 2 finish + Phase 6)
6. Email + cron (Phase 4) last, once the manual flow is proven

Approve and I'll start with the migration.