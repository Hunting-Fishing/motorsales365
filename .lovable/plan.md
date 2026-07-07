## Goal

Treat every `@365motorsales.com` account as a member of the single internal "365 MotorSales" organization, with a manager→report hierarchy (Joan → Jordi), unified data across Team and Staff & Access, staff-to-staff messaging, and an in-page info button explaining how the page works.

## Data model

Add one column + one policy — no new tables.

- `profiles.manager_user_id uuid null references auth.users(id)` — the person's direct manager inside 365. Nullable; `admin@365motorsales.com` is the root (null manager).
- Backfill: for every staff profile (email ends `@365motorsales.com`) whose `manager_user_id` is null and who is not admin, set it to the admin user's id.
- `organization_members` RLS: allow SELECT for any member of the same org (currently members can only see themselves in some paths — this is what breaks Team). This gives Joan visibility into Jordi and vice versa without touching FKs.
- Trigger update: `handle_new_user` already routes @365 signups to the canonical org. Extend it to also stamp `manager_user_id = <creator's id>` when the signup was initiated by an admin action (falls back to admin user id).
- No FK is added between `organization_members.user_id` and `profiles` — we keep the two-query merge pattern already used in `leads.functions.ts` and `seller-staff.functions.ts`.

## Server functions (new, in `src/lib/internal-staff.functions.ts`)

All gated by `requireSupabaseAuth` + staff-scope check (`is365Staff`):

- `listInternalStaff()` → returns every @365 member with `{ user_id, full_name, email, avatar_url, manager_user_id, role }`. Merge `organization_members` + `profiles` client-side (same pattern as the recent fixes).
- `getStaffTree()` → same data shaped as a tree rooted at admin.
- `createInternalStaff({ email, fullName, password, managerUserId })` → **admin-only**. Uses `supabaseAdmin.auth.admin.createUser`, forces email domain `@365motorsales.com`, sets `manager_user_id`, inserts `organization_members` row in the canonical org. Rejects non-admin callers.
- `updateStaffManager({ userId, managerUserId })` → admin-only; re-parents a node. Prevents cycles.
- `deactivateInternalStaff({ userId })` → admin-only; disables sign-in via admin API and removes org membership.

## UI changes (shared data, two framings)

Both surfaces render from the same server functions:

**`/dashboard/staff`** (Staff & Access — permissions view)
- For @365 users, replace the current seller-org UI with an internal-staff view.
- Flat member list + role/permission editing + reset password + deactivate (admin-only actions).
- Add "Add staff" dialog — visible only when caller is admin. Fields: full name, email (locked to `@365motorsales.com` suffix), password, manager (defaults to caller).
- Add **info button** (Popover with `Info` icon in the header) explaining: "Everyone on `@365motorsales.com` is part of the internal 365 MotorSales team. Only `admin@365motorsales.com` can add or remove staff. Your manager can see your activity; you can see your direct reports."

**`/dashboard/team/members`** (Team — collaboration view)
- For @365 users, hide the seller invite form entirely and render an **org chart** instead: admin at top, children indented under their manager, using the same data.
- Each node shows name, role, and a "Message" button that opens the existing 1:1 messages thread (reuses the current `messages` table — no schema change).
- Non-admin @365 users see the tree read-only; admins get inline "Add report under this person" and "Move" actions that call `createInternalStaff` / `updateStaffManager`.
- External sellers keep the existing invite flow unchanged.

## Messaging

Reuse the existing `messages` table. Add a "Message" affordance next to each staff row that navigates to the existing DM route with the target `user_id` prefilled. No new tables. Ensure the messages RLS already permits same-org DMs; if not, extend the existing policy to allow when both parties are in the canonical 365 org.

## Info button (addresses "no information button here to know more about dashboard / staff")

Header on both `/dashboard/staff` and `/dashboard/team/members` gets an `Info` icon → Popover with:
- What this page is for
- Who can invite (admin only)
- How the manager tree works (visibility + messaging, no commissions)
- Link to `/help/internal-staff` (new short markdown-style route) for the long form.

## Detection

Use existing `useStaffScope()` / `getMyStaffScope` — if `is365Staff`, render the internal variant; otherwise keep the current seller UI untouched.

## Out of scope (explicit)

- No commission overrides, no MLM payouts, no downline revenue math — memory rule on Partner Program remains intact; this is internal reporting only.
- No new messaging tables or channels.
- No changes to external seller Team/Staff flows.

## Files touched

- New migration: add `profiles.manager_user_id`, backfill, extend `handle_new_user`, adjust `organization_members` SELECT policy for same-org visibility.
- New: `src/lib/internal-staff.functions.ts`.
- New: `src/components/internal-staff/StaffTree.tsx`, `AddInternalStaffDialog.tsx`, `StaffInfoPopover.tsx`.
- New: `src/routes/help.internal-staff.tsx` (public help page, noindex).
- Edited: `src/routes/dashboard.staff.tsx` — branch on `is365Staff`.
- Edited: `src/routes/dashboard.team.members.tsx` — branch on `is365Staff`, render tree + Message buttons.
- Edited: `src/hooks/use-staff-scope.ts` if we need `managerUserId` exposed.
