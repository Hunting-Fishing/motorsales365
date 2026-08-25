# 365 Motor Sales — Lovable Cloud to Standalone Supabase Migration

## Objective

Move 365 Motor Sales from the Lovable Cloud Supabase project to a standalone Supabase project controlled by the operator, without changing production traffic until validation is complete.

Current Lovable Cloud project reference at migration start:

```text
jfjrnjyroxvlydajvndl
```

The target standalone project reference must be inserted only after the target project is created.

## Safety rules

- Do not delete, disable, pause, or overwrite the Lovable Cloud database during the copy phase.
- Do not point production at the target database until schema, data, Auth, Storage, RLS, functions, and application flows pass validation.
- Never commit service-role keys, database passwords, OAuth secrets, payment secrets, webhook secrets, or private API credentials.
- Treat production writes during the migration window as a cutover concern; define a final synchronization/freeze strategy before switching endpoints.
- Preserve a rollback path until post-cutover validation is complete.

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

### Phase 4 — Copy data

Copy application data with primary keys and timestamps preserved where required.

Validate per-table row counts and high-value aggregates. Record exceptions rather than silently dropping rows.

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

### Phase 10 — Cutover

Define a final synchronization window for records written after the initial data copy.

Then:

1. Perform final sync/freeze as appropriate.
2. Switch application environment variables to the standalone target.
3. Deploy.
4. Execute smoke tests.
5. Monitor Auth, API, database, storage, and payment errors.
6. Keep Lovable Cloud intact as rollback until the agreed observation period passes.

### Phase 11 — Lovable retirement

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
- [ ] Create standalone 365 Motor Sales Supabase project.
- [ ] Apply schema migrations.
- [ ] Inventory/copy production data.
- [ ] Migrate/reconfigure Auth.
- [ ] Migrate Storage.
- [ ] Recreate backend functions/secrets.
- [ ] Update project configuration.
- [ ] Validate end-to-end flows.
- [ ] Cut over production.
- [ ] Retire Lovable dependency.
