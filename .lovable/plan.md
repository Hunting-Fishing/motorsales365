# Phase 2 Route Audit — Completion Plan

Finish migrating all remaining role-gated server functions and the `/api/admin/create-user` HTTP route onto the audited middleware factories, then expose the audit data in the Admin UI. Everything stays in-house: no third-party services, all logging via `supabaseAdmin` to `public.route_audit_log` already in place.

## 1. Domain sweeps — replace inline role checks with `requireDomainRole(role, label)`

For each function below, drop the manual `assertX` / `supabase.rpc("can_*")` block and chain the audited middleware. Labels use `module.function` for grep-ability.

### Shop (`src/lib/shop.functions.ts`) — role: `shop_manager`
- `adminListProducts`, `adminGetProduct`, `adminUpsertProduct`, `adminDeleteProduct`, `adminListCategories`, `adminUpsertCategory`, `adminDeleteCategory`, `adminListBrands`, `adminUpsertBrand`, `adminDeleteBrand`, `adminListDepartments`, `adminUpsertDepartment`, `adminDeleteDepartment`, `scrapeShopUrl`
- Remove `assertShopManager` helper after last caller is migrated.

### Education (`src/lib/education.functions.ts`) — role: `moderator`
- 11 `admin*` functions covering courses, lessons, modules, instructors, partner training. Replace `assertModerator` calls.

### Export brokerage (`src/lib/export-brokerage.functions.ts`) — role: `support`
- `listExportInquiries`, `updateExportInquiry`.

### Organizations (`src/lib/organizations.functions.ts`) — role: org-scoped (keep as-is)
- `inviteOrgMember`, `updateMemberRole`, `removeMember`, `listOrgInvites` use `can_manage_org(_user_id, _org_id)` with a **per-call orgId**, which the generic `requireDomainRole` factory cannot express.
- Add a dedicated `auditOrgAction(label, outcome, ...)` helper (thin wrapper over `logRouteAccess` with `role: "org_manager"`) and call it from inside the existing `assertOrgManager` / handler — both `denied` and `allowed` paths — with `targetSummary: { org_id }`.
- Apply same pattern to `leads.functions.ts` (`assignLead`, `updateLeadStatus`, `getOrgPerformance`) where org membership is the gate.

### Admin users HTTP route (`src/routes/api/admin/create-user.tsx`)
- Wrap the existing inline admin check: log `denied` on 403, `allowed` + `targetSummary: { email, role }` on success, `error` on thrown exceptions. Uses `logRouteAccess` directly (not middleware — it's a raw TSS handler).

## 2. Admin UI — "Route access" tab in `src/routes/admin.audit.tsx`

- Add a new server fn `listRouteAuditLog` (in a new `src/lib/route-audit.functions.ts`) gated by `requireAdminRoleAudited("audit.listRouteAccess")`. Inputs: optional `actorId`, `routeLabel` (ilike), `roleRequired`, `outcome`, `fromDate`, `toDate`, `limit` (default 100, max 500). Returns rows joined with `profiles` (actor full_name/email) via two queries (no FK).
- Extend `admin.audit.tsx` with shadcn `Tabs`:
  - **"User actions"** (existing `admin_audit_log` view).
  - **"Route access"** (new) — filter form (actor search, route label, role select, outcome select, date range) + table: timestamp, actor, role, route, method, outcome (colored badge), duration, IP.
- Pagination: simple "Load more" using `created_at` cursor.

## 3. Verification

1. `supabase--linter` clean after no schema changes (table already exists from prior migration).
2. Smoke-test one route per domain as admin and as non-admin/non-role user; confirm `allowed` and `denied` rows appear with correct `route_label`, `role_required`, `ip`, `user_agent`, `duration_ms`.
3. Hit `/api/admin/create-user` with bad payload → `error` row. With non-admin → `denied`. With admin → `allowed` + `targetSummary`.
4. Load `/admin/audit` → "Route access" tab; verify filters work, non-admin gets 403, support role can read (RLS allows).
5. Confirm no remaining `supabase.rpc("can_shop_manager"|"can_moderate"|"can_support"|"can_manage_ads", ...)` inline checks in `src/lib/*.functions.ts` and `src/utils/*.functions.ts` (ripgrep sweep).

## Out of scope
- Owner-scoped CRUD (vehicles, rides, garage, business-pages) — already gated by `userId` and not "admin-protected" surface.
- Public reads, webhook routes with HMAC/signature (Stripe, payment-events, ops-alerts-digest) — already verified by signature.
- Retention/cleanup of `route_audit_log` rows (add later if volume requires).

## Technical notes
- `requireDomainRole` already proxies `userId` via `requireSupabaseAuth` context; handler signatures need to switch from destructuring `context.supabase, context.userId` (currently from auth middleware) to the same — unchanged, since `requireDomainRole` composes `requireSupabaseAuth`.
- For org-scoped audit, never call `requireDomainRole` (it doesn't know orgId); always use the inline helper + `logRouteAccess` to keep the org id in `targetSummary`.
- `route_audit_log` insert path is best-effort and already wrapped in try/catch — no risk of breaking the underlying action.
