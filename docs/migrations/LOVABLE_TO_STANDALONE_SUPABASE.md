# 365 Motor Sales — Lovable Cloud to Standalone Supabase Migration

## Objective

Move 365 Motor Sales from the Lovable Cloud Supabase project to a standalone Supabase project controlled by the operator, without changing production traffic until validation is complete.

Source Lovable Cloud project reference:

```text
jfjrnjyroxvlydajvndl
```

Target standalone Supabase project reference:

```text
wjxaajgvddtrxxtocxen
```

## Safety rules

- Do not delete, disable, pause, or overwrite the Lovable Cloud database during the copy phase.
- Do not point production at the target database until schema, data, Auth, Storage, RLS, functions, and application flows pass validation.
- Never commit service-role keys, database passwords, OAuth secrets, payment secrets, webhook secrets, or private API credentials.
- Treat production writes during the migration window as a cutover concern; define a final synchronization/freeze strategy before switching endpoints.
- Preserve a rollback path until post-cutover validation is complete.
- Keep target cron jobs disabled during copy/validation so migrated jobs do not execute against incomplete data or external services.

## Verified checkpoint — 2026-08-25

Schema replay is complete on the standalone target.

- 388 / 388 repository migrations successfully applied.
- 0 unresolved migration failures.
- 260 public base tables.
- 269 public functions.
- 703 public RLS policies.
- 12 storage buckets recreated by schema migrations.
- 0 active cron jobs during migration.
- All public base tables have RLS enabled.
- 0 unvalidated public foreign-key constraints.
- Target production-user data has not been copied yet.
- Target Auth currently contains 0 users.
- Target Storage currently contains 0 objects.
- Lovable production remains the active source of truth and has not been cut over.

Historical migration failures were repaired and then successfully replayed. Repairs were limited to source-schema prerequisites that existed in Lovable but were missing from the checked-in migration history, including organization infrastructure, organization references, shop category hierarchy, and required business-type reference rows.

### Security-advisor checkpoint

Supabase's advisor reports inherited security findings from the source schema, including SECURITY DEFINER views/RPC grants and RLS-enabled `shop_manager` tables with no explicit policies. These are not treated as migration failures because schema parity is the immediate objective. Do not blindly harden these before application compatibility testing; review them in a dedicated post-copy hardening pass and convert/revoke only after confirming required application behavior.

## Migration phases

### Phase 1 — Inventory

Record:

- Existing Lovable project reference.
- GitHub migration files under `supabase/migrations/`.
- Public tables, views, sequences, functions, triggers, extensions, and RLS policies.
- Auth providers, redirect URLs, templates, and user counts.
- Storage buckets, policies, and object counts.
- Realtime configuration.
- Edge/backend functions and required secrets.
- External services and webhooks.
- Frontend/backend environment-variable names.

### Phase 2 — Provision target

Create a dedicated standalone Supabase project for 365 Motor Sales.

Do not place 365 Motor Sales data in the SWGOH Command Center database and do not share its service-role credentials with another product.

### Phase 3 — Rebuild schema

Apply the repository's existing Supabase migration history to the target in chronological order.

After application:

- Compare table/view/function counts.
- Compare RLS enablement and policies.
- Verify extensions.
- Verify triggers and database functions.
- Verify grants for `anon`, `authenticated`, and service roles.

**Status: complete.**

### Phase 4 — Copy data

Copy application data with primary keys and timestamps preserved where required.

Validate per-table row counts and high-value aggregates. Record exceptions rather than silently dropping rows.

Preferred source-access order:

1. Direct database export/dump if Lovable exposes a database connection credential.
2. Source `SUPABASE_SERVICE_ROLE_KEY` through a controlled, temporary server-side exporter if direct DB access is unavailable.
3. Supabase Admin API/PostgREST + Storage API export where schema/API exposure permits it.
4. Manual CSV only as a last resort for isolated tables, not as the default migration method.

Do not commit the source service-role key. The existing server application expects Lovable Cloud to inject `SUPABASE_SERVICE_ROLE_KEY` at runtime.

### Phase 5 — Auth

Inventory Lovable Auth capabilities and determine the supported user-migration path.

If password hashes cannot be migrated safely through available access, migrate user/profile identity metadata and use a controlled password-reset flow rather than attempting to reconstruct passwords.

Verify:

- Email/password login.
- Email confirmation behavior.
- OAuth providers.
- Password reset.
- Redirect URLs.
- Session persistence.
- Admin/role claims and profile linkage.

### Phase 6 — Storage

Recreate required buckets and policies. Copy storage objects while preserving expected object paths.

Verify representative public and private object access before cutover.

### Phase 7 — Backend services and secrets

Recreate any required Edge Functions/server functions on infrastructure owned outside Lovable.

Register secret *names* in documentation but store secret *values* only in deployment secret stores.

### Phase 8 — Application configuration

Update the migration branch to use the target project URL/reference and the correct publishable key/environment contract.

Do not expose service-role credentials to browser code.

### Phase 9 — Validation

Minimum acceptance checks:

- Homepage and public browsing.
- Search/filter flows.
- Account creation/login/logout/password reset.
- Listing create/edit/delete.
- Photo/video/storage upload and retrieval.
- Business profile create/edit.
- Directory/map workflows.
- Referral/QR attribution.
- Shop Manager workflows currently part of 365 Motor Sales.
- Admin permissions.
- Billing/payment flows in test mode where applicable.
- RLS negative tests proving one user/business cannot read or modify another user's private records.

### Phase 10 — Security hardening

After data copy and compatibility validation, review inherited Supabase advisor findings. Prioritize:

1. SECURITY DEFINER views exposed through the public schema.
2. SECURITY DEFINER functions executable by `anon` when not intentionally public.
3. SECURITY DEFINER functions executable by all authenticated users when intended only for admin/service contexts.
4. `shop_manager` RLS-enabled tables without policies: confirm whether they are intentionally service-role-only or require tenant policies.
5. Extension placement warnings such as `pg_trgm` in `public`.

Each change must be application-tested and committed as a new standalone migration rather than silently mutating historical migrations.

### Phase 11 — Cutover

Define a final synchronization window for records written after the initial data copy.

Then:

1. Perform final sync/freeze as appropriate.
2. Switch application environment variables to the standalone target.
3. Deploy.
4. Execute smoke tests.
5. Monitor Auth, API, database, storage, and payment errors.
6. Keep Lovable Cloud intact as rollback until the agreed observation period passes.

### Phase 12 — Lovable retirement

Only after successful validation:

- Confirm GitHub is authoritative source control.
- Confirm production hosting no longer depends on Lovable.
- Confirm production database/Auth/Storage no longer depend on Lovable Cloud.
- Export/archive any Lovable-only project knowledge or operational documentation worth preserving.
- Remove paid Lovable dependencies only after independent production operation is proven.

## Architecture after cutover

365 Motor Sales remains independently saleable. Connections to Barangay Buddy, Drone Network, Shop Manager, and future products must use versioned APIs and stable external identifiers as defined in `docs/architecture/DATA_OWNERSHIP.md` and `docs/architecture/INTEGRATION_REGISTRY.md`.

## Migration status

- [x] Identify current Lovable Cloud project reference.
- [x] Confirm Supabase migration history exists in GitHub.
- [x] Create isolated migration branch.
- [x] Define data-ownership boundaries.
- [x] Define ecosystem integration registry.
- [x] Create standalone 365 Motor Sales Supabase project.
- [x] Apply all 388 schema migrations.
- [x] Validate migration replay / unresolved-failure count.
- [x] Validate public-table RLS enablement and FK validation state.
- [ ] Obtain controlled source data-export credential/path.
- [ ] Inventory/copy production data.
- [ ] Migrate/reconfigure Auth.
- [ ] Migrate Storage objects.
- [ ] Recreate backend functions/secrets.
- [ ] Update project configuration.
- [ ] Validate end-to-end flows.
- [ ] Review inherited security-advisor findings.
- [ ] Cut over production.
- [ ] Retire Lovable dependency.
