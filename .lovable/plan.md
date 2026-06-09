## Goal

Let any seller who signs up create sub-users (e.g. `steve@laoagcarsales`) directly from their profile — no email activation. Sub-users sign in to 365motorsales.com and act on behalf of the seller account: post/edit the seller's vehicle listings and reply to customer messages. Each seller account is fully isolated from every other seller.

## Model

Reuse the existing `organizations` + `organization_members` tables (already used for the Team / Leads inbox) as the "seller account". Every seller signup gets one auto-created organization; sub-users are extra rows in `organization_members`.

Two roles only:
- **Owner** — the original signup. Full control + billing + can add/remove staff.
- **Staff** — sub-user. Can post/edit listings and reply to customer messages under the seller account. Cannot manage billing or other staff.

We collapse the existing 5-role enum down at the policy level: Owner = current `owner`; Staff = current `member`. `admin/manager/viewer` are hidden from the UI but kept in the enum for backward compatibility with the Leads inbox.

## Sub-user creation (direct, no email)

New admin server route `POST /api/seller/staff/create` (server route, uses `supabaseAdmin`):
- Owner-only (checked via `can_manage_org`).
- Body: `{ orgId, username, password, fullName }`.
- Synthesizes an email like `username@laoagcarsales.staff.365motorsales.local` (from the org slug) so Supabase Auth has a unique key, but the sub-user signs in with **username + password** on the login page. The synthetic email is hidden from the UI.
- Creates the auth user with `email_confirm: true` (instant activation, no email sent).
- Inserts `organization_members` row with role = `member` (Staff).
- Stamps `profiles.parent_org_id` and `profiles.login_username` for lookup at sign-in.
- Enforces seat limit before creating (see Plan limits below).

Login page change: accept either email or `username@orgslug`. If the input contains no `@`, resolve `login_username` → synthetic email and call `signInWithPassword` with that. Owners still log in with their real email.

Owner can reset a sub-user's password or deactivate (revoke role + disable auth user) from the same screen.

## Listings & messages access for Staff

Today `listings` RLS is owner-only (`auth.uid() = user_id`). We extend it so any org member of the listing's `organization_id` can update/delete and read draft/inactive rows:

- New helper `public.user_can_edit_listing(_listing_id uuid)` — true if `user_id = auth.uid()` OR the listing has an `organization_id` and the caller is an org member.
- Rewrite "Owners update/delete listings" + the private-read policy to use it.
- INSERT policy stays `auth.uid() = user_id` but new listings created by a Staff member auto-set `organization_id` to the staff's org via a BEFORE INSERT trigger (so the owner can also see/edit them).
- Same pattern applied to `listing_media`, `listing_boosts`, `messages`, `service_inquiries` (any "owner of the listing" check becomes "owner OR org member of the listing's org").

## Plan-based seat limits

Extend `subscription_plans` with `max_seats int` (null = unlimited). Defaults:
- Free / Private Seller: **1** (owner only — no sub-users).
- Pro / Dealer: **5**.
- Business / Enterprise: **null** (unlimited).

Seat-count helper `public.org_seat_count(_org_id uuid)` used by `create-staff` route:
```text
if seat_count >= plan.max_seats → 402 { upgrade_required: true, current_plan, max_seats }
```
UI shows "3 of 5 seats used · Upgrade for more" on the Staff page.

## UI

**Profile → "Staff & Access" tab** (new route `/dashboard/staff`, owner-only):
- Header: seller account name + seat usage badge.
- Table: username, full name, last sign-in, status, actions (Reset password, Deactivate).
- "Add staff" dialog: full name, username (validated against org slug), password, confirm password. On submit → instant activation toast with the new sign-in URL.

The existing `/dashboard/team` (Leads/CRM) stays as-is for organizations that use the lead inbox; the new Staff page is the primary surface for the seller-account use case.

## Isolation guarantees (already enforced, called out for safety)

- `is_org_member` / `can_manage_org` security-definer functions gate everything.
- `organizations`, `organization_members`, `listings`, `messages`, `service_inquiries` keep RLS on with `auth.uid()`-scoped checks — no cross-account reads possible.
- The synthetic staff email lives in `auth.users` only; never exposed on public pages.
- Staff cannot read/modify billing tables (`subscriptions`, `payments`) — those policies stay owner-scoped.

## Technical changes

### Migration
- `ALTER TABLE profiles ADD COLUMN login_username citext UNIQUE, ADD COLUMN parent_org_id uuid, ADD COLUMN is_staff_account boolean DEFAULT false`.
- `ALTER TABLE subscription_plans ADD COLUMN max_seats int`.
- Functions: `user_can_edit_listing`, `org_seat_count`, `resolve_username_to_email`.
- Rewrite RLS on `listings` (UPDATE/DELETE/private SELECT), `listing_media`, `messages`, `service_inquiries` to use org membership.
- Trigger `tg_set_listing_org` on `listings` BEFORE INSERT to stamp `organization_id` from the staff's org.
- Trigger `tg_auto_create_seller_org` on `profiles` AFTER INSERT — when a new seller signup happens, auto-create their organization and owner membership.
- Backfill: for every existing profile with no membership, create an org + owner row.

### Server routes / functions
- `src/routes/api/seller/staff/create.tsx` (POST, owner-only, service role).
- `src/routes/api/seller/staff/reset-password.tsx` (POST, owner-only).
- `src/routes/api/seller/staff/deactivate.tsx` (POST, owner-only).
- `src/lib/seller-staff.functions.ts` — `listStaff`, `getSeatUsage` (read-only RPCs for the UI).
- `src/lib/seller-staff.ts` — `resolveLoginInput(input)` client helper for the login page.

### UI
- `src/routes/_authenticated/dashboard.staff.tsx` — new Staff & Access page.
- `src/components/seller/staff-table.tsx`, `add-staff-dialog.tsx`, `reset-password-dialog.tsx`.
- Login page: add username-or-email handling.
- Profile nav: new "Staff & Access" link, visible only to owners.

### Terms
Per project memory, update `/terms` to disclose sub-user/staff accounts (owner is responsible for actions taken by staff under their account) and bump "Last updated".

## Out of scope (can follow up)
- Granular per-listing permissions (which staff can edit which listings).
- Staff activity audit log UI (rows are still captured in `route_audit_log`).
- Email notifications to staff (intentionally none, per your spec).
- Seat-based add-on billing in Stripe (we only enforce the cap; upgrade flow points to existing plan upgrade page).
