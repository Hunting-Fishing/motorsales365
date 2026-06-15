## 1. Collapsed report cards on the resolved/all list

Right now `ReportCard` always renders the full panel (reason, evidence, listing details, action history, dispute panel). On `/admin/reports?filter=resolved` this makes the list a wall of text.

Change `ReportCard` to support a **collapsed posting-style summary** and an **expanded full view**:

- Add an `expanded` prop (controlled by parent) plus an internal default.
- Collapsed row shows, in a single clickable card (like a listing row):
  - Status pill (resolved/open) + report category/reason short label
  - Listing thumbnail + title (or target type/url when no listing)
  - Reporter chip (member #, name) and report date
  - Final action taken (from latest `report_actions` row) + resolver
  - Chevron / "View details" affordance
- Expanded view = current full content (reason, evidence carousel, posting user panel, history, dispute panel, action buttons).
- Collapsed is the default for `filter !== "open"`; open reports stay expanded by default so moderators can still triage quickly.

### Scroll restoration

In `admin.reports.tsx`:
- Track the expanded report id in the URL via `search.expanded` (uuid, optional) using the existing `validateSearch` schema. This makes the state shareable and survives reloads.
- When a card is expanded, scroll its container into view smoothly; when collapsed, do nothing (the card stays in place so the user is already at "the exact spot").
- Add `id={`report-${r.id}`}` to each card wrapper and on mount/route-change, if `search.expanded` is set, call `scrollIntoView({ block: "start" })` after the list loads.
- Back/forward navigation already restores `search.expanded`, so returning from a deep action keeps the same card open and in view.

## 2. Notifications when a reported user is someone's 365 client

Trigger: a new row in `public.reports` whose `target_type = 'listing'` (or `'user'`) maps to a `target_user_id`. Recipients:

1. The **assigned 365 sales rep** for that user (lookup via `sales_rep_assignments` where `subject_type='user'` and `subject_id = target_user_id` and `active = true`).
2. **All main admins** (everyone in `user_roles` with role `admin`).

Implementation:

- New migration adds a Postgres trigger `tg_notify_report_created` on `public.reports AFTER INSERT`:
  - Resolve `target_user_id` (from `listings.user_id` when `target_type='listing'`, or `reports.target_user_id` directly).
  - Look up the active assigned rep.
  - Insert one `ops_alerts` row of kind `report_filed` with `severity='warning'`, `payload` = `{ report_id, target_user_id, reporter_id, category, assigned_rep_id }` so it surfaces in the existing admin alerts UI (already used elsewhere — see `admin.alerts.tsx`).
  - For the assigned rep (if any), insert a row into a new lightweight `staff_inbox_notifications` table — or reuse the existing `sales_rep_followups` table by inserting a `kind='client_reported'` row referencing the report so it shows up on the rep's dashboard.
- Email path: when the rep has an email on file, enqueue a transactional email `client-reported-notice` via the existing `sendTransactionalEmail` helper. Template: short notice with reporter category, link to `/staff/clients/{userId}` and `/admin/reports?expanded={reportId}` (admins only). Admins get the same email through their existing ops digest — no per-event admin email to avoid noise.
- In-app: extend `admin-notification-bell.tsx` to show the new `ops_alerts` kind; add a small badge on the rep's staff dashboard linking to the client and the report.

### Technical notes

- Trigger uses `SECURITY DEFINER` with `set search_path = public` and only reads/writes tables it owns; no auth.uid() inside.
- Email send is fire-and-forget from a server function called by the same RPC that creates the report (or from a `pg_net` call inside the trigger if already wired — fallback: have `report-actions.functions.ts`/the report-create server fn enqueue after insert so we don't add `pg_net`).
- Skip notification when reporter == target (self-reports) or when target has no assigned rep (still notify admins via ops_alerts).

## Out of scope

- Redesigning the open-reports moderation flow.
- Changing dispute/rewards logic.
- SMS or push notifications.

## Files touched

- `src/components/admin/report-card.tsx` — collapsed/expanded modes, `expanded` prop.
- `src/routes/admin.reports.tsx` — `expanded` search param, scroll-into-view, default-collapsed when filter ≠ open.
- `src/components/admin/admin-notification-bell.tsx` — surface `report_filed` alerts.
- New `src/lib/email-templates/client-reported-notice.tsx` + registry entry.
- New migration: trigger + (optional) `staff_inbox_notifications` or `sales_rep_followups` insert.
- `src/lib/report-*.functions.ts` — after successful report insert, fan out rep email.
