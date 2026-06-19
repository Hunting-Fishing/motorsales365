# Plan: Admin tests, permission editor, expanded audit log

Three independent additions. Each can be reviewed/rolled back on its own.

## 1. Automated tests — non-admin route/UI gating

**Stack:** Vitest + React Testing Library (already present via Vite). Add `vitest` config if missing.

**New files**
- `src/__tests__/admin-nav.test.ts` — pure-data tests over `ADMIN_NAV` from `src/lib/admin-nav.ts`:
  - For each role in `["sales","moderator","support","advertising"]`: assert no nav item that requires only `admin` is visible to them.
  - Assert every nav item lists at least one role.
  - Snapshot of role → accessible routes matrix.
- `src/__tests__/admin-guard.test.tsx` — unit-test the `hasAccess = isAdmin` gate in `src/routes/admin.tsx` by mocking `useAuth` and rendering the layout's gate function; verify non-admin (sales/moderator/support/advertising) sees the "Admin access required" redirect branch, admin sees children.
- `src/__tests__/dashboard-admin-link.test.tsx` — render `<Dashboard />` with `useAuth` mocks for: anonymous, non-admin staff, admin. Assert the "Admin" link is rendered only for admin (both desktop sidebar and mobile dropdown).
- `src/__tests__/site-header-admin-buttons.test.tsx` — render `<SiteHeader />` with the same three personas. Assert Admin portal button and "View as" dropdown only render for real admins.

**Tooling**
- Add `bun add -d vitest @testing-library/react @testing-library/jest-dom jsdom` if not installed.
- Add `vitest.config.ts` with `jsdom` env and a `src/test/setup.ts` that imports `@testing-library/jest-dom`.
- Add `"test": "vitest run"` to `package.json` scripts.

Tests are pure unit tests with mocked `useAuth` and `supabase` — no live DB.

## 2. Role permission editor (no redeploy)

**Model:** introduce a `role_permissions` table that maps `(role, permission_key) → enabled`. Permissions are string keys (e.g. `nav.lead-offers`, `nav.users`, `action.delete-listing`, `action.refund-payment`). `admin` always implicitly has every permission and cannot be edited off.

**Migration** (`role_permissions`):
- columns: `role app_role`, `permission_key text`, `enabled boolean default true`, `updated_at`, `updated_by uuid`. PK `(role, permission_key)`.
- GRANT SELECT to `authenticated`; GRANT ALL to `service_role`. RLS: SELECT for any authenticated user; INSERT/UPDATE only via `has_role(auth.uid(),'admin')`.
- Seed rows from current `ADMIN_NAV` (one row per `(role, nav.<slug>)` pair) plus a starter set of action keys.
- New SQL function `has_permission(_user_id uuid, _key text) returns boolean` (SECURITY DEFINER) — true if user is admin OR any of their roles has the key enabled.

**Frontend**
- `src/lib/permissions.ts` — `PERMISSION_CATALOG` (typed list of keys + human label + category) and a `usePermissions()` hook (React Query) loading enabled keys for the current user.
- `src/lib/admin-nav.ts` — each nav item gains optional `permissionKey`. The admin layout sidebar filter switches from "roles include mine" to "admin OR permissionKey enabled for me".
- New route `src/routes/admin.permissions.tsx` (admin-only via existing guard): a matrix table (rows = permission keys grouped by category, columns = non-admin roles) with toggle switches. Saving calls `setRolePermission` server fn.
- `src/lib/role-permissions.functions.ts` — `listRolePermissions` and `setRolePermission` server functions, both `requireSupabaseAuth` + admin check, write to `admin_audit_log` (see #3).
- Add nav item "Permissions" (admin-only) under People section.

**Out of scope for this iteration:** wiring every existing action button to `has_permission` — only nav visibility is wired now. Action keys exist in the catalog so the editor is useful, and individual buttons can be migrated in follow-up work.

## 3. Admin action audit log

**Schema change** (migration): widen `admin_audit_log.action` semantics.
- Drop the implicit code-side enum; add columns `entity_type text`, `entity_id text`, `metadata jsonb` (nullable). `field`, `old_value`, `new_value`, `target_user_id` become nullable so generic button clicks fit.
- Backfill is not needed (existing rows already have target_user_id/field populated).
- Index `(action, created_at desc)`.

**Logging API**
- Replace `src/lib/admin-audit.ts` types: add generic `logAdminAction({ action, entity_type?, entity_id?, target_user_id?, metadata? })` alongside the existing typed helper (kept for backward compat).
- New server function `src/lib/admin-audit.functions.ts → recordAdminAction` (auth + admin required) — used when client-side logging would be untrusted (e.g. destructive actions). Returns void.
- Wire calls in the highest-traffic admin action handlers:
  - role grant/revoke (already logged via existing helper — keep)
  - permission toggle save (new in #2)
  - listing approve/reject, business approve/reject, verification approve/reject, payment refund, user ban/unban, magic link issue
  - For broad coverage, add a small `<AdminActionButton>` wrapper component in `src/components/admin/admin-action-button.tsx` that takes `action`, `entity_type`, `entity_id` props, logs on click, then invokes the original handler. Migrate the above buttons to use it; others can adopt it incrementally.

**Viewer**
- `src/routes/admin.audit.tsx` already exists — extend it with:
  - filter by `action`, `entity_type`, actor email, date range
  - new columns: entity, metadata (pretty-printed JSON in a popover)
  - CSV export of current filter

## Files

**New:** `src/__tests__/*.test.{ts,tsx}`, `vitest.config.ts`, `src/test/setup.ts`, `src/lib/permissions.ts`, `src/lib/role-permissions.functions.ts`, `src/lib/admin-audit.functions.ts`, `src/routes/admin.permissions.tsx`, `src/components/admin/admin-action-button.tsx`.
**Edited:** `src/lib/admin-nav.ts` (add permissionKey + Permissions nav entry), `src/lib/admin-audit.ts` (generic logger), `src/routes/admin.tsx` (sidebar filter uses permissions), `src/routes/admin.audit.tsx` (filters + columns + CSV), `package.json` (test script + dev deps).
**Migrations:** create `role_permissions` + `has_permission`; widen `admin_audit_log`.

## Open questions

1. Should the permission editor also allow creating brand-new roles, or only toggle permissions for the fixed `sales / moderator / support / advertising` set? (Plan assumes the latter — simpler and matches `app_role` enum.)
2. For audit coverage: is the curated "high-traffic actions" set above enough for v1, or do you want every button in `/admin/*` instrumented before this ships?
