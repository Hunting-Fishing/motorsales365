## Goal

Treat every `@365motorsales.com` signup as internal staff of the single canonical **365 MotorSales** organization (owned by `Admin@365motorsales.com`) instead of spinning up a separate business/org for each of them.

## Findings

- There is already **one canonical org**: `365 MotorSales` (id `d45bc407-1510-46e5-9ff2-a9789ad002fa`, kind `dealership`), owned by the admin user.
- Two other orgs (`365 TOWING TEST` x2) are test seed data owned by different users — not related.
- `public.profiles` already has the exact fields we need: `parent_org_id`, `is_staff_account`, `signup_intent`.
- `handle_new_user()` currently branches on `signup_intent` from client metadata; for `business`/`service_provider` intents it writes business fields into the profile, and downstream flows (dashboard / claim / onboarding) then let them create their own business + org. That's what's producing the "independent business" behavior for @365 emails.
- Recent `@365motorsales.com` accounts (e.g. Joan Gadin) already show `1 of 3 seats used` under their own "Staff & Access" — confirming an auto-provisioned personal org.

## Plan

### 1. Server-side gate on signup (new migration)

Update `public.handle_new_user()` so that when `lower(NEW.email)` ends with `@365motorsales.com`:

- Force `signup_intent := 'internal_staff'` (new value) — ignore any client-sent `business`/`service_provider` intent.
- Do **not** populate `business_name` / `business_*` fields on the profile.
- Set `is_staff_account := true`, `parent_org_id := <canonical 365 org id>`.
- Set `seller_type := 'private'` (they sell nothing personally).
- Insert a row into `public.organization_members` with `organization_id = <canonical>`, `role = 'staff'` (or `member` — see Q1 below), `user_id = NEW.id`.
- Do this via a `SECURITY DEFINER` helper so the trigger can write to `organization_members` without granting anon/authenticated write on that table.

The canonical org id is stored in a single `public.internal_org_settings` row (or hard-coded constant inside the function) so we're not looking it up by slug every insert.

### 2. Block "create my business" for internal staff

- Add an RLS check + client guard: profiles where `is_staff_account = true AND parent_org_id = <canonical>` cannot own a `businesses` or `organizations` row (owner_id / created_by can't equal their user id, except for the canonical org itself). Enforced via a `BEFORE INSERT` trigger on `businesses` and `organizations` that raises a friendly error.
- On the frontend, hide "Create business / Add my business" CTAs when `profile.is_staff_account && profile.parent_org_id === CANONICAL_365_ORG_ID`, and instead show a "You're on the 365 MotorSales internal team" badge that links to `/dashboard/team`.

### 3. Backfill existing @365motorsales.com users

Same migration:

- For every `auth.users` row with email ending in `@365motorsales.com`:
  - Set `profiles.is_staff_account = true`, `parent_org_id = <canonical>`, `signup_intent = 'internal_staff'`.
  - Upsert into `organization_members` (canonical org, chosen role).
- For any `businesses` / `organizations` those users own that are NOT the canonical org: mark `status = 'archived'` (don't hard-delete — preserves any listings/leads history) and reassign `owner_id` / `created_by` to the admin user. Log each change to `admin_audit_log`.
- Test seed rows (`365 TOWING TEST` x2) — leave alone (owned by non-@365 emails).

### 4. Route users into the internal team UI

- On login, if `is_staff_account && parent_org_id = canonical`, the default dashboard org context becomes the canonical 365 org so they land on `/dashboard/team?orgId=<canonical>` and see the real internal inbox / members / performance — not their old personal org.

## Open questions

1. **Role name for new internal staff** in `organization_members` — `staff`, `member`, or `admin`? Current default assumption: `staff`. Admin-level access still requires an explicit grant via `user_roles`.
2. **Domain scope** — only `@365motorsales.com`, or also `@365motorsales.ph` / other variants? Current assumption: exact match on `@365motorsales.com` (case-insensitive).
3. **Backfill of existing personal businesses** — archive (recommended, reversible) vs delete. Current assumption: archive + reassign to admin, no deletion.

## Technical notes

- New enum value `'internal_staff'` on the `signup_intent` text field (it's a `text`, not an enum, so no enum migration needed).
- New table `public.internal_org_settings (key text primary key, org_id uuid)` seeded with `('canonical_365', 'd45bc407-1510-46e5-9ff2-a9789ad002fa')` — with GRANTs and RLS `USING (false)` for direct client access, read via `SECURITY DEFINER` helper.
- Guard triggers on `businesses` / `organizations` use `SECURITY DEFINER` helper `is_internal_365_staff(uuid)` to avoid recursive RLS.
- No changes to auth config, no new secrets, no edge functions.
