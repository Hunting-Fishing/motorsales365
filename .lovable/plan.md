## Goal
When an admin approves or rejects an ad creative:
1. The uploader gets an **email** and an **in-app notification**.
2. Every approve/reject action is permanently recorded in an **audit trail** (admin, timestamp, reason, before/after status).

---

## 1. Database (one migration)

### `ad_creative_audit_log` — permanent record of every review action
- `creative_id` → `ad_creatives.id` (cascade)
- `order_id` → `ad_orders.id` nullable (for advertiser ads)
- `actor_id` → `auth.users.id` (the admin)
- `action` text check in (`approved`, `rejected`, `revoked`, `resubmitted`)
- `previous_status`, `new_status` (ad_creative_status enum)
- `reason` text (required for reject)
- `notes` text (optional approve notes)
- `metadata` jsonb (slot keys, dimensions snapshot, etc.)
- `created_at`

RLS:
- Admins / `advertising` role → SELECT all, INSERT.
- Uploader → SELECT rows where `creative_id` belongs to them (so they can see their own history).
- GRANTs: SELECT/INSERT to `authenticated`, ALL to `service_role`.

### `user_notifications` — generic in-app inbox (first use: ad approvals)
- `user_id` → `auth.users.id` (cascade)
- `category` text (`ad_creative_approved`, `ad_creative_rejected`, future-proofed)
- `title` text, `body` text
- `link_url` text (e.g. `/advertise/creatives/{id}`)
- `entity_type` text, `entity_id` uuid (creative id)
- `metadata` jsonb
- `read_at` timestamptz nullable
- `created_at`

RLS:
- Owner can SELECT and UPDATE (`read_at` only — enforced via policy + trigger preventing other column changes by non-service callers).
- Service role inserts.
- GRANTs: SELECT/UPDATE to `authenticated`, ALL to `service_role`.

Indexes: `(user_id, read_at, created_at desc)`, `(creative_id)` on audit.

---

## 2. Email templates (`src/lib/email-templates/`)
- `ad-creative-approved.tsx` — "Your ad creative is approved" + slot list + preview thumbnail + link to advertise dashboard.
- `ad-creative-rejected.tsx` — "Your ad creative needs changes" + rejection reason + link to re-upload.
- Register both in `registry.ts`.

Brand-consistent with existing ad-inquiry templates (reuse `_styles.ts`).

---

## 3. Server functions (`src/lib/advertise-slots.functions.ts`)

Extend `approveCreative` and `rejectCreative` handlers (after the existing status update + assignment toggle):

1. Load creative with `uploaded_by`, `kind`, `headline`, `order_id`, `status` (previous), and uploader's email/display name from `profiles`/`auth.users` via `supabaseAdmin`.
2. Insert into `ad_creative_audit_log` (action, previous_status, new_status, reason/notes, actor_id, metadata).
3. **Skip notifications for `kind = 'placeholder'`** (admin-created, no advertiser to notify) — still write audit row.
4. For advertiser creatives:
   - Insert `user_notifications` row (admin client) for the uploader.
   - Call `enqueueTransactionalEmailServer` with template `ad-creative-approved` or `ad-creative-rejected`, `idempotencyKey: \`ad-creative-${action}-${creativeId}\``.

Keep existing `ad_order_events` insert intact (order-level log stays).

New read fns:
- `listMyCreativeAudit({ creativeId })` — uploader can fetch their creative's history.
- `listCreativeAuditAdmin({ creativeId })` — admin view.

---

## 4. In-app notification surface

- New hook `src/hooks/use-user-notifications.ts` (TanStack Query, 30s stale).
- New server fns `listMyNotifications`, `markNotificationRead`, `markAllNotificationsRead` (with `requireSupabaseAuth`).
- New small component `src/components/advertise/creative-notifications-panel.tsx` rendered on the advertiser advertise portal page — shows unread count badge, dropdown list, mark-as-read on click, link to the creative.
- Mount the panel in the existing `/advertise` route header (advertiser portal). No global header changes.

---

## 5. Admin audit trail UI

- New tab "History" on the existing `/admin/advertisements/approvals` route (or inline expander on each creative card) showing the audit log entries for the selected creative: action badge, admin name, timestamp, reason/notes.
- Reuses `listCreativeAuditAdmin`.

---

## 6. Verification
- Approve a pending creative → audit row inserted, `user_notifications` row appears for uploader, `email_send_log` shows pending row for `ad-creative-approved`.
- Reject with reason → audit row with reason, notification + email use rejection template, reason text shown in both.
- Placeholder approve/reject → audit row only, no email/notification.
- Re-approving an already-approved creative still creates a fresh audit row.

## Out of scope
- Push/SMS notifications.
- Notifications for non-ad events.
- Bulk approve UI changes.
