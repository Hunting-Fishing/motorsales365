## Goal

1. Make it visually obvious in the admin user editor when an account is a 365 staff member.
2. Restrict what **sales** and **advertising** staff can see and do in the admin area to only what's relevant to their role.
3. Allow them to see other staff of the same role + analytics, but require **explicit peer approval** before they can contact another staff member's client — with a full history log.

---

## What changes (plain English)

### A. "365 Staff" badge (read-only)
- In the Edit User dialog (and the user row in `/admin/users`), show a **365 Staff** pill when the account's email ends in `@365motorsales.com`.
- Pill is informational only. Seller type stays Private/Business; nothing is forced.

### B. Sales & Advertising scope (admin area)
Sales and advertising staff (who are NOT also admin/moderator) get a narrower admin experience:

- **Own profile only** — they can edit only their own name / phone / avatar. They cannot edit other users.
- **Their assigned clients only** — leads/inquiries appear only when assigned to them (via `sales_rep_assignments` for sales, `ad_inquiries.assigned_to` for advertising).
- **Same-role peer visibility** — they CAN see the list of other staff who share their role, plus team analytics (counts, conversion, response time). No PII beyond name + role + photo.
- **Cross-staff client contact requires approval** — if Sales-A wants to reach Sales-B's client, they file a request. Sales-B must approve or deny in-app. Approved requests time-box access (default 7 days) and are logged. Denied/expired = no access.

Admin and moderator roles are unaffected (full access as today).

### C. Peer approval workflow + history
- New "Client Contact Requests" inbox on the staff dashboard.
- Each request stores: requester, target staff (owner), client/lead reference, reason, status (pending/approved/denied/expired/revoked), decided_at, decided_by, expires_at.
- Every state change writes an immutable audit entry visible to both parties and to admins.
- Notifications: in-app toast/badge on the target's dashboard; admin gets a daily summary.

---

## Technical section

### Database (one migration)

1. **Helper function** `public.is_365_staff(_user_id uuid) returns boolean` — security definer; true if the auth email ends with `@365motorsales.com`.
2. **`staff_client_contact_requests`** table:
   - `requester_id uuid`, `owner_staff_id uuid`, `client_user_id uuid` (nullable), `lead_id uuid` (nullable), `inquiry_id uuid` (nullable) — at least one of the last three required (trigger check).
   - `reason text not null`, `status text not null default 'pending'` (check: pending|approved|denied|expired|revoked).
   - `decided_by uuid`, `decided_at timestamptz`, `decision_note text`, `expires_at timestamptz`.
   - Standard `created_at`/`updated_at` + update trigger.
   - GRANTs to `authenticated` + `service_role`.
   - RLS:
     - Requester can SELECT/INSERT their own rows.
     - Owner can SELECT rows where `owner_staff_id = auth.uid()` and UPDATE only status/decision fields when row is `pending`.
     - Admins (`has_role(auth.uid(),'admin')`) full SELECT.
3. **`staff_client_contact_audit`** table (append-only): `request_id`, `actor_id`, `action` (created|approved|denied|revoked|expired|viewed_client), `note`, `created_at`. GRANTs + RLS (insert via trigger only; SELECT for participants + admins).
4. **Trigger** on `staff_client_contact_requests` that writes an audit row on INSERT and on status change.
5. **Server-side helper** `public.has_active_client_access(_staff uuid, _client uuid)` — returns true if `_staff` is the assigned owner OR has an approved, unexpired, unrevoked request for that client. Used by future admin queries; existing tables are not re-policied in this pass to keep blast radius small.

### Server functions (new file `src/lib/staff-contact-requests.functions.ts`)
All `requireSupabaseAuth` + role check (`sales` or `advertising` or `admin`):
- `listContactRequests({ box: 'inbox' | 'outbox' })`
- `createContactRequest({ ownerStaffId, clientUserId?, leadId?, inquiryId?, reason })`
- `decideContactRequest({ id, decision: 'approved'|'denied', note?, expiresInDays? })` — only the owner.
- `revokeContactRequest({ id })` — owner or admin.

### Frontend
- `src/components/admin/staff-365-badge.tsx` — pill component (`is_365_staff` derived from email prop).
- `src/components/admin/edit-user-dialog.tsx` — render badge in header.
- `src/routes/admin.users.tsx` — show badge in the user row.
- `src/routes/dashboard.staff-requests.tsx` — Inbox / Outbox tabs, decision dialog with optional note + duration.
- `src/components/admin/contact-request-button.tsx` — appears on a client/lead card when the current staff is NOT the owner; opens a request modal.
- `src/hooks/use-staff-scope.ts` — small helper returning `{ isStaff365, roleScope: 'admin'|'sales'|'advertising'|'other', canSeeAllUsers, canSeeAllLeads }`. Existing admin pages use this to hide controls (server still enforces).

### Server enforcement (defense in depth)
- Where existing admin `*.functions.ts` already gate on admin role, add a parallel branch for sales/advertising that narrows the result set (own profile, own assignments). This is the second half of phase B and will be wired up file-by-file in a follow-up turn after the schema lands — too many files to safely edit in the same turn as the migration.

### Out of scope for this plan
- Email notifications for approval requests (in-app only this round).
- Bulk-approval UI.
- Updating `/terms` & `/privacy` — peer-approval contact and audit logging touch data handling, so I'll bump the "Last updated" date and add a one-sentence note in the same turn that adds the workflow.

---

## Phasing

1. **Migration + 365 Staff badge** (this approval): schema, RLS, helper fn, badge component, badge wired into edit dialog and users list.
2. **Workflow UI + server fns**: requests inbox/outbox, request button, decide/revoke flows, audit display.
3. **Admin-area scoping**: update existing admin server fns and pages to use `use-staff-scope` so sales/advertising see only their own profile + assigned clients + same-role peers/analytics.

Reply "approve" to start phase 1.