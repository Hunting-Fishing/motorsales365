## Goal
Add an admin page at `/admin/sales-reps` to manage Sales Reps, their territories (regions/provinces/cities), and which businesses/users are assigned to them. Wires into existing `sales-rep.functions.ts` admin server fns.

## Route & access
- File: `src/routes/admin.sales-reps.tsx`
- Inherits the `/admin` layout gate (admin/sales roles). Visible only to `admin`.
- Add nav entry in `src/routes/admin.tsx` (roles: `["admin"]`) labeled "Sales Reps".

## Page layout (Tabs)

**Tab 1 — Reps**
- Table of all users with `sales` role (uses `adminListReps`): avatar, name, email, title, # active assignments, # territories, accepting new clients toggle, last activity.
- Row click → opens Rep Detail drawer.

**Tab 2 — Assignments**
- Filters: rep, source (referral/manual/territory), subject_type (user/business), search.
- Table: subject (user or business name + link), rep, source, assigned_at, assigned_by, active.
- Row actions: Reassign (rep picker → `adminAssignRep`), Unassign (`adminUnassign`).
- Bulk action: "Auto-assign by territory" button → confirm modal → `adminBulkAssignByTerritory` (shows count assigned).

**Tab 3 — Territories**
- Grouped by rep. For each rep: list of (region, province, city, primary) chips with remove (×).
- "Add territory" inline form per rep: region select (PH regions list), optional province, optional city, primary checkbox → `addMyTerritory` admin variant (add `adminAddTerritory` / `adminRemoveTerritory` thin wrappers in `sales-rep.functions.ts`).

## Rep Detail drawer (right-side Sheet)
Sections:
1. **Profile** — title, bio, public_phone, public_email, photo override, accepting_new_clients. Save → `adminSaveRepProfile` (new wrapper).
2. **Territories** — same chips + add form as Tab 3, scoped to this rep.
3. **Assignments** — table of accounts owned by this rep, with Reassign/Unassign.
4. **Stats** — KPI cards: total referrals, signups (30d), active businesses, redemption revenue (reads `getMyRepStats` w/ admin override → add `adminGetRepStats`).

## "Stores / Locations / Business Rep" handling
Treat businesses as one subject type in `sales_rep_assignments` (`subject_type='business'`). The Assignments tab and Rep Detail show businesses alongside users. No new tables — multi-location stores are already separate rows in `businesses`.

## New server fn wrappers (added to `src/lib/sales-rep.functions.ts`)
- `adminAddTerritory({ rep_user_id, region, province?, city?, is_primary })`
- `adminRemoveTerritory({ id })`
- `adminListTerritories({ rep_user_id? })`
- `adminSaveRepProfile({ rep_user_id, ...fields })`
- `adminGetRepStats({ rep_user_id })`
- `adminListAssignments({ rep_user_id?, source?, subject_type?, search? })`

Each gated by `requireSupabaseAuth` + an inline `has_role('admin')` check (pattern already in file).

## Components
- `src/components/admin/sales-reps/RepsTable.tsx`
- `src/components/admin/sales-reps/AssignmentsTable.tsx`
- `src/components/admin/sales-reps/TerritoriesPanel.tsx`
- `src/components/admin/sales-reps/RepDetailSheet.tsx`
- `src/components/admin/sales-reps/AssignRepDialog.tsx` (rep combobox)
- `src/lib/ph-regions.ts` — static list of PH regions for selects (already may exist; reuse if so).

## Data fetching
- TanStack Query: one query per tab keyed by filters. `queryClient.invalidateQueries` after mutations.
- Mutations via `useMutation` + `useServerFn`, toast on success/error.

## Out of scope
- Editing the rep's user account itself (email/password) — handled in `/admin/staff-365`.
- Customer-facing rep card and rep dashboard (Phases 3 & 4).
- Followups admin view.

## Phasing
1. Add server fn wrappers.
2. Build route + tabs + tables (read-only).
3. Wire mutations (assign/unassign/territory CRUD/profile save).
4. Add nav entry and verify admin-only visibility.
