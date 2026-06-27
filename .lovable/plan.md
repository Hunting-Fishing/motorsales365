## Goal

Two changes to the admin "Edit user profile" experience used on `/admin/staff-365` and `/admin/users`:

1. **Only `admin`-role accounts may change roles.** All other staff (sales, support, advertising, moderator, etc.) see the Roles tab as read-only.
2. **Make every tab in Edit User Profile actually round-trip to the correct table** — Identity/Address → `profiles`, Business → `profiles` *and* the user's `businesses` row when they own one, Ads → `advertisements` (already wired via `UserAdvertisementsTab`, will verify).

## Scope

- `/admin/staff-365` (super-admin only) — Roles tab stays editable for the super-admin.
- `/admin/users` — Roles tab becomes read-only unless the caller has `admin` role.
- Edit User Profile dialog — fields persist to the right tables on save.

## Changes

### 1. Gate the Roles tab by caller role

- `src/components/admin/edit-profile-dialog.tsx`
  - Accept a new prop `canEditRoles?: boolean` (default `false`).
  - When `false`: render `RoleChips` disabled, hide the save-side role diff logic, and show a small "Only Admin accounts can change roles" hint.
  - Keep the tab visible (so non-admins can still see what roles a user has).
- `src/routes/admin.users.tsx` and `src/routes/admin.staff-365.tsx`
  - Compute `canEditRoles` from the current viewer: `useStaffScope().scope.isAdmin` (super-admin always true on staff-365).
  - Pass `canEditRoles` into `<EditProfileDialog />`.
- `src/lib/admin-profile.functions.ts` — no change needed; roles are not edited here.
- Defense in depth: tighten the existing `user_roles` RLS so only `has_role(auth.uid(),'admin')` can INSERT/DELETE rows. Today the client writes directly via `supabase.from("user_roles")`; if the policy isn't already admin-only, add a migration to make it so. (Will verify policies first; only add migration if needed.)

### 2. Edit User Profile → correct tables

Current state confirmed by reading the code:

- **Identity / Address / Seller type / Verification / Personal email** → `profiles` via `adminUpdateUserProfile` server fn. ✅ Already correct.
- **Work email** → `auth.users` via `supabaseAdmin.auth.admin.updateUserById`. ✅ Already correct.
- **Business fields** (`business_name`, `business_kind`, `business_address`, `business_city`, `business_province`, `business_region`, `business_postal_code`) → currently only written to `profiles`. The user-facing business page lives in the `businesses` table, so edits here never reach the public business listing.
  - Update `adminUpdateUserProfile` to: write to `profiles` (as today) **and** if the target user owns exactly one row in `businesses` (`owner_id = targetUserId`), mirror the same fields to that row (`name`, `kind`, `address`, `city`, `province`, `region`, `postal_code`). If they own zero or multiple businesses, only `profiles` is touched and the dialog shows a small note ("User owns N businesses — edit each on its Business page").
  - Surface the owned-business count in `listStaff365` / admin user loader so the dialog can render the note.
- **Roles** → `user_roles` directly. ✅ Already correct (gated per #1).
- **Ads tab** → `UserAdvertisementsTab` already reads/writes `advertisements`. Will spot-check that create/edit calls use the user's `owner_id`, fix if missing.

### 3. Small polish

- In the Business tab, add a read-only "Linked business" badge that links to `/admin/businesses/<id>` when one is found, so admins know edits will sync.

## Out of scope

- No changes to `/admin/staff-365` access control itself — still super-admin only.
- No schema changes beyond the optional `user_roles` policy tightening.
- No redesign of the dialog layout.

## Verification

- Typecheck.
- Manual: as super-admin, edit a staff member's business address → confirm both `profiles` row and their `businesses` row update; as a non-admin staff viewer, confirm Roles tab is disabled with the explanatory note.
