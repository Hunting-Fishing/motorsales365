## Goal
1. Make `/admin` and every `/admin/*` URL strictly admin-only — no staff role bypass.
2. Hide all "Admin"/admin-action buttons from non-admin users wherever they appear.
3. Add an admin-only Permission Diagnostics page that shows the current user (and a looked-up user) with their real roles, simulated roles, effective roles, derived booleans, and which admin nav items each role grants.

## Current behavior
- `src/routes/admin.tsx` gates with `hasAccess = isStaff` and filters the sidebar `NAV` per role. Non-admin staff can land on `/admin` and reach any admin URL whose `roles` list includes their role.
- `src/routes/dashboard.tsx` shows an "Admin" / "Staff console" link to any `isStaff` user (desktop sidebar at L253 + mobile dropdown at L366).
- `src/components/site-header.tsx` was tightened in the previous turn (Admin button + View-as now admin-only).
- `src/components/admin/posting-user-panel.tsx` and `add-user-dialog.tsx` link to admin URLs but are already only rendered inside admin pages, so they're naturally gated by the new layout guard.

## Changes

### 1. Admin-only route guard (`src/routes/admin.tsx`)
- Replace `hasAccess = isStaff` with `hasAccess = isAdmin`.
- Drop the `myRoles` array; the visible NAV becomes simply `NAV` (all items) since every viewer is an admin. Keep the `roles` field on `NavItem` for the diagnostics page.
- Update the "Checking access…" / redirect branch:
  - `!user` → redirect to `/login`.
  - signed in but `!isAdmin` → redirect to `/dashboard` and show a one-shot toast: "Admin access required."
- Header label collapses to `"Admin"` (drop the staff fallback labels).
- The 2FA enforcement block stays unchanged.
- The redirect on direct navigation already happens client-side via `useEffect`; this layout owns every `/admin/*` child via file-based routing, so all admin URLs inherit the gate.

### 2. Hide admin-action buttons from non-admins
- `src/routes/dashboard.tsx`:
  - Desktop sidebar (L253): change `{isStaff && (` → `{isAdmin && (` and simplify the label to "Admin".
  - Mobile dropdown (L366): same swap.
- `src/components/site-header.tsx`: already correct from the previous turn — no edits.
- `src/components/admin/posting-user-panel.tsx`, `add-user-dialog.tsx`: no change (only rendered inside admin pages, which are now admin-only).

### 3. Admin-only Permission Diagnostics page
New route `src/routes/admin.diagnostics.tsx` (URL `/admin/diagnostics`). Sits inside the now-admin-only `/admin` layout, so no extra gating needed.

Content sections:
- **My session**: email, user id, real roles (chips), simulated roles (chips with "simulating" badge if active), effective roles, derived booleans (`isAdmin`, `isSales`, `isModerator`, `isSupport`, `isAdvertising`, `isStaff`, `salesTier`, `canManageAds`, `canCreatePromotions`, `canIssueDiscounts`), seller type (real vs effective).
- **Admin nav matrix**: table of every `NAV` item with columns: Section, Label, Required roles, "You can access?" (✓/✗ based on effective roles). Reuses the `NAV` array exported from `admin.tsx` (small refactor: move `NAV` + `NavItem` + `Role` into `src/lib/admin-nav.ts` so the diagnostics page can import without circular deps).
- **Look up a user**: email input → calls a new authenticated server function `getUserPermissionDossier` that:
  - Requires admin via `requireSupabaseAuth` + `has_role(auth.uid(), 'admin')` check (throws Forbidden otherwise).
  - Uses `supabaseAdmin` (loaded inside the handler) to find the user by email via `auth.admin.listUsers` (paged search) and reads `user_roles`, `profiles.seller_type`, `profiles.full_name`.
  - Returns `{ user_id, email, full_name, seller_type, roles[] }` or `{ not_found: true }`.
- Shows the looked-up user's roles as chips and re-renders the nav matrix for "would they be able to access?" with the same logic.

Add a sidebar entry to NAV:
```
{ to: "/admin/diagnostics", label: "Permission diagnostics", Icon: ShieldCheck, roles: ["admin"], info: "Inspect roles and permissions for any user.", section: "Platform" }
```

### 4. Files
- **Edit** `src/routes/admin.tsx` — admin-only gate, simplified label, add diagnostics NAV entry, import NAV from new module.
- **Create** `src/lib/admin-nav.ts` — moves `Role`, `NavItem`, `NAV` out of `admin.tsx`.
- **Edit** `src/routes/dashboard.tsx` — swap `isStaff` → `isAdmin` for the two Admin link blocks.
- **Create** `src/routes/admin.diagnostics.tsx` — diagnostics UI.
- **Create** `src/lib/admin-diagnostics.functions.ts` — `getUserPermissionDossier` server function.

### 5. Out of scope
- No DB migration; roles already live in `user_roles` and `has_role()` exists.
- No changes to `useAuth` or the role-simulation feature.
- No edits to the dozens of admin sub-pages — they're now reachable only by admins, so their internal action buttons are admin-by-construction.
