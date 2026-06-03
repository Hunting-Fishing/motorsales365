# Route Access Audit Log

Today we have `admin_audit_log`, but it only records targeted user-mutation events (role grants, verification, seller type). It does not answer "who called which protected route, when, and with what outcome." This plan adds that.

## What we're building

1. A new `public.route_audit_log` table that records one row per call to any admin- or domain-role-gated server function (and the `/api/admin/*` HTTP route).
2. A single audit point baked into the middleware/gate layer so every protected route is covered automatically — no per-handler boilerplate.
3. A read-only admin UI section on `/admin/audit` to browse and filter the new log.

The existing `admin_audit_log` stays untouched; it remains the canonical record for user-mutation events. The new table is for access/coverage telemetry.

## Schema

```text
public.route_audit_log
- id              uuid pk
- actor_id        uuid not null            -- caller's auth.uid()
- role_required   text not null            -- 'admin'|'moderator'|'shop_manager'|'ads_manager'|'support'|'org_manager'
- route_label     text not null            -- e.g. 'shop.adminUpsertProduct', 'api.admin.create-user'
- method          text                     -- 'GET'|'POST'
- outcome         text not null            -- 'allowed'|'denied'|'error'
- error_message   text                     -- truncated, null on success
- ip              text                     -- from x-forwarded-for / cf-connecting-ip
- user_agent      text                     -- truncated to 500 chars
- duration_ms     integer                  -- handler wall time, null on denied
- target_summary  jsonb                    -- small, redacted summary of inputs (ids only)
- created_at      timestamptz default now()
```

Indexes on `(actor_id, created_at desc)`, `(route_label, created_at desc)`, `(created_at desc)`, partial `(outcome) where outcome <> 'allowed'`.

RLS: `admin` and `can_support` read; inserts only via `service_role` (server-side only). No anon, no authenticated insert.

## Server wiring (single audit point per gate)

We already have two enforcement styles. Both get instrumented once:

### A. Middleware-based gates (admin role)

Extend `src/integrations/supabase/admin-middleware.ts`:
- `requireAdminRole` stays, but wraps `next()` to record outcome + duration.
- New factory `requireDomainRole(role, { label })` that performs the appropriate `can_*` RPC, throws 403 on deny, and logs both allow and deny outcomes.

Switch the inline gates that currently live inside handlers (`assertShopManager`, `assertModerator`, `assertCanModerate`, `can_manage_ads` checks in `ads.functions.ts`, `can_support` checks in `export-brokerage.functions.ts`, `can_manage_org` checks in `leads.functions.ts` / `organizations.functions.ts`) to use the new middleware factory so logging is automatic. Where a handler needs `context.userId` after the gate, that still works because the middleware composes with `requireSupabaseAuth`.

Every `createServerFn` chain that uses a gate gets a `label` (e.g. `"shop.adminUpsertProduct"`). Labels are stable strings declared next to the route — used for filtering in the UI.

### B. Raw HTTP route (`/api/admin/create-user`)

Add a small `logRouteAccess()` helper from `internal-secrets.server.ts` neighbours and call it after the inline admin check + at the end of the handler (both allow and error paths). No middleware swap needed — this is the only non-`createServerFn` admin route.

### Logging helper

`src/integrations/supabase/route-audit.server.ts`:
- `logRouteAccess({ actorId, role, label, method, outcome, error?, durationMs?, request?, targetSummary? })`
- Best-effort: wraps in try/catch, never throws into the handler.
- Uses `supabaseAdmin` (service role).
- Extracts IP from `cf-connecting-ip` → `x-forwarded-for` (first hop) → null.
- Truncates user-agent to 500 chars, error to 1000 chars.
- `targetSummary` is opt-in per route: pass a small `{ id, …ids }` object — never raw bodies, never PII.

## Admin UI

Extend `src/routes/admin.audit.tsx` with a tabbed view:
- Tab 1 (existing): "User changes" → current `admin_audit_log`.
- Tab 2 (new): "Route access" → `route_audit_log` with filters for actor, route_label, role_required, outcome, and a date range. Default view: last 24h, denied + error first.

A new server function `listRouteAuditLog` (gated by `requireAdminRole` — which itself logs, that's fine) returns paginated rows with the actor's email/full_name joined from `profiles`.

## Out of scope (deliberate)

- Read-only public endpoints (`/api/public/*` geocode, reverse-geocode, geo-search, shop/listing reads). No audit value, high volume.
- Owner-scoped user CRUD (vehicles, rides, profile, business-pages owner edits). These aren't role-gated.
- Webhook/cron routes that are HMAC/token-verified — they already log via `email_send_log` / their own tables.
- Retention/cleanup. We'll address pruning in a follow-up once we know the volume.

## Verification

- Hit each gated route as admin and as non-admin; confirm `allowed` and `denied` rows appear.
- `supabase--linter` clean.
- `/admin/audit` "Route access" tab loads, filters work, non-admin/non-support cannot query the table directly (RLS test via `supabase--read_query` as `authenticated`).
- Smoke an `/api/admin/create-user` call with a bad payload to confirm `error` outcome captured.

## Deliverables

- 1 migration: `route_audit_log` table, indexes, GRANTs, RLS policies.
- 1 new file: `src/integrations/supabase/route-audit.server.ts`.
- Updates to `src/integrations/supabase/admin-middleware.ts` (audit `requireAdminRole`, add `requireDomainRole`).
- Migrate inline gates in `shop.functions.ts`, `education.functions.ts`, `ads.functions.ts`, `export-brokerage.functions.ts`, `leads.functions.ts`, `organizations.functions.ts`, `places.functions.ts`, `payments.functions.ts`, `admin-users.functions.ts` to the new middleware (or call `logRouteAccess` directly where the gate must remain inline).
- Update `/api/admin/create-user` handler with logging.
- 1 new server fn: `listRouteAuditLog`.
- UI update to `src/routes/admin.audit.tsx`.
