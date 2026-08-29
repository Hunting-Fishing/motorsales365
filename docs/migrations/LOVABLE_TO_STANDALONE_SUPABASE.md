# 365 Motor Sales — Lovable Cloud to Standalone Supabase Migration

## Objective

Move 365 Motor Sales from Lovable Cloud Supabase to a standalone Supabase project controlled by the operator, with no production traffic switch until validation is complete.

- Source Lovable Cloud project reference: `jfjrnjyroxvlydajvndl`
- Target standalone Supabase project reference: `wjxaajgvddtrxxtocxen`
- Target organization: **366 Industries AI Platform**
- Target region: **Singapore (`ap-southeast-1`)**
- Working branch: `migration/standalone-supabase-365`

## Absolute safety rules

1. Never modify `main` as part of this migration.
2. Do not delete, alter, pause, or write to the Lovable source database.
3. Do not truncate or rebuild destination production data.
4. Do not recreate migrated Auth users.
5. Never print, commit, or log service-role keys, database passwords, OAuth secrets, payment secrets, webhook secrets, provider credentials, or other private credentials.
6. Never add a fallback call to Lovable. Missing provider credentials must disable or fail the feature cleanly.
7. Keep target cron jobs disabled until standalone application endpoints pass staging smoke tests.
8. Preserve migration/helper infrastructure and the Lovable rollback source until post-cutover validation is complete.
9. Treat source production writes after the initial copy as a final-delta synchronization concern; never assume the first copy remains current.

## Current migration checkpoint

### Application and GitHub

Current branch head validated on 29 Aug 2026:

`22096bd5c6f5927c6f93b861427752d3ae186685`

At this head, all three standalone GitHub workflows are green:

- **Standalone Runtime CI** — success
- **Standalone Lockfile Refresh** — success
- **Build Standalone Supabase Migration Chunks** — success

The runtime CI now proves, from a clean checkout:

- deterministic install using `npm ci --legacy-peer-deps --no-audit --no-fund`;
- executable runtime source is guarded from the Lovable source project and Lovable API endpoints;
- unit tests run before build-generated output can affect test discovery;
- the clean-source unit-test suite passes;
- the standalone application builds successfully on Node 22.

The npm lockfile has been regenerated for the migration branch. `--legacy-peer-deps` remains intentionally required because `@tanstack/zod-adapter` declares a Zod 3 peer while the application intentionally uses Zod 4.

The intentional legacy QR rescue detector may recognize old printed Lovable-preview QR hosts locally. That is compatibility parsing only and is not a runtime fallback to Lovable.

The application uses Cloudflare Workers/TanStack server routes. No production Cloudflare or DNS cutover has occurred from this branch.

Public client configuration targets the standalone Supabase project. Private server/provider values must remain in deployment secret stores and never Git.

### Schema and database

The repository schema replay completed successfully.

Historical replay checkpoint:

- 388 / 388 repository migrations successfully applied.
- 0 unresolved migration failures.
- Historical replay counts: 260 public base tables, 269 public functions, 703 public RLS policies before migration/helper objects were added.

Subsequent target audit recorded:

- 263 public base tables.
- 272 public functions.
- 704 public RLS policies.
- 0 public base tables with RLS disabled.
- 0 unvalidated public foreign-key constraints.
- 0 active target cron jobs.
- No stored public function/procedure or view dependency on the Lovable source project found in the migration audit.

Historical replay repairs were limited to prerequisites that existed in the source schema but were absent from checked-in migration history, including organization infrastructure/references, shop category hierarchy, and required business-type reference rows.

### Production data copy

The initial production-data sweep completed on the target:

- 261 public application tables included in the sweep.
- 19,358 application rows copied.
- 19 `auth.users` records.
- 19 `public.profiles` records.
- 3 active `public.listings` records.
- 4 `public.businesses` records.
- 15,487 `public.email_send_log` records.

These counts prove that the standalone target is populated. They are **not** a replacement for the final delta synchronization immediately before production cutover.

### Auth

- 19 existing Auth users have been migrated.
- Do not recreate them.
- Profile linkage exists for the 19 migrated profiles.
- Standalone Auth application regression tests pass in CI.
- Successful login/token-refresh activity has been observed on the target.
- Target Auth mail delivery is **not yet accepted as cutover-ready**.

Before staging acceptance verify in the target Supabase configuration:

- custom SMTP/mail provider configuration;
- production Site URL;
- staging and production redirect URLs;
- confirmation-email delivery and callback behavior;
- password-reset delivery and callback behavior;
- any enabled OAuth provider configuration.

A successful Auth data migration does not prove confirmation/reset-email delivery.

### Storage

Storage migration is substantially complete. Two oversized draft videos remain absent from the standalone target:

```text
listing-videos/drafts/66beaa5c-a1d6-4a24-a6c0-ce6cb5d79f7f/fb46125a-5702-4e3b-a238-ac8de8ebca7f/VIDEO-2026-08-25-01-04-28.mp4
listing-videos/drafts/66beaa5c-a1d6-4a24-a6c0-ce6cb5d79f7f/fb46125a-5702-4e3b-a238-ac8de8ebca7f/VIDEO-2026-08-25-01-04-26.mp4
```

Each is approximately 86.5 MiB / 90.7 MB.

Known findings:

- `listing-videos` has no bucket-specific file-size limit.
- The target organization is on Supabase Pro.
- The remaining failure is consistent with the project/global Storage upload-size setting.
- Raise the standalone project global upload limit comfortably above ~91 MB (for example at least 100 MB) and retry those two objects.
- Do not remove storage migration helpers until the two objects are copied or explicitly accepted as exclusions.

### Migration helper infrastructure

The target retains JWT-protected migration/helper Edge Functions, including:

- `legacy-migration-bootstrap`
- `migration-source-pull`
- `migration-source-preflight`
- `migration-lovable-source-check`
- `migration-storage-copy`
- `migration-auth-sync`
- `migration-auth-encrypted`
- `migration-public-large-storage-copy`

Observed helper state includes:

- `public.migration_auth_transfer_keys`: 0 rows.
- `public.migration_ingest`: 450 rows.

Keep these helpers until cutover succeeds and the rollback/reconciliation window closes.

`email_queue_dispatch` was intentionally not migrated because its source implementation called Lovable-only email infrastructure. Standalone email dispatch must use the independently configured provider path and must never fall back to Lovable.

### Cron

There are currently **0 active cron jobs** on the standalone target. This is intentional. Do not activate or recreate production recurring jobs until staging endpoints pass the acceptance gate below.

### Security-advisor checkpoint

Supabase advisor findings inherited from the source schema include SECURITY DEFINER/search-path concerns and policy-review items. These are not migration-copy failures. Preserve parity first; do not blindly harden historical objects during cutover. Required hardening should be application-tested and committed as new standalone migrations.

## Migration phases and status

### 1. Inventory — substantially complete

Keep provider/deployment secret-name inventory current through staging. Record names only, never values.

### 2. Provision standalone target — complete

The standalone project is provisioned and isolated for 365 Motor Sales.

### 3. Rebuild schema — complete

All 388 repository migrations replayed successfully and the target schema has been audited.

### 4. Initial production data copy — complete

The initial application-data sweep completed. A final production delta is still mandatory before cutover.

### 5. Auth migration — data complete, delivery configuration pending

Nineteen users were migrated without recreating them. Application Auth tests are green. SMTP/Site URL/redirect/provider configuration still requires staging acceptance.

### 6. Storage — substantially complete

Only the two documented oversized draft videos remain blocked by the global upload limit.

### 7. Backend services and secrets — code path validated, deployment configuration pending

Standalone runtime/provider paths build successfully and do not fall back to Lovable. Required private values still need to be present in the staging deployment secret store.

### 8. Application configuration — branch complete, production switch pending

Migration-branch client configuration targets standalone Supabase. Production hosting has not been switched.

### 9. Staging deployment and acceptance tests — next major gate

Deploy the migration branch to an isolated Cloudflare staging environment with standalone secret values configured outside Git.

Minimum staging acceptance matrix:

1. Homepage renders from the standalone runtime.
2. Public listings load from the target database and known active listings are reachable.
3. Listing detail pages render media from target Storage.
4. Existing-user login works against standalone Auth.
5. Logout and session refresh/recovery work.
6. Confirmation/reset mail works using a controlled test path without recreating migrated users.
7. Listing create/edit/delete works with RLS enforced.
8. Photo/video upload and retrieval works, including the configured maximum video size.
9. Business profile create/edit works.
10. Directory/map workflows work.
11. Referral/QR attribution works, including legacy QR rescue without calling Lovable.
12. Shop Manager critical workflows work against the standalone target.
13. Admin permissions and role gating work.
14. Transactional email/provider paths work without Lovable.
15. Stripe/payment flows are exercised in an appropriate safe/test mode and webhook configuration is verified.
16. RLS negative tests prove one tenant cannot access another tenant's private records.
17. Application/provider logs contain no calls to the Lovable source project.

**Gate: target cron remains OFF until this phase passes.**

### 10. Recreate required scheduled jobs — not started by design

After staging passes, inventory the source recurring jobs, recreate only still-required standalone equivalents, verify each endpoint/provider path, then activate cautiously and observe executions.

### 11. Security hardening — post-compatibility gate

Review inherited advisor findings after runtime compatibility is proven. Prioritize SECURITY DEFINER exposure, function execution grants, mutable `search_path`, tenant RLS coverage, extension placement, and grants. Commit fixes as new migrations.

### 12. Final synchronization and production cutover — not started

Immediately before production switch:

1. Define/freeze the production write window as required.
2. Run the retained Lovable-source-to-standalone **delta** synchronization.
3. Reconcile critical row counts, Auth count, and Storage exceptions.
4. Confirm the two oversized videos are copied or explicitly accepted as exclusions.
5. Confirm staging remains green after the final delta.
6. Switch production Cloudflare runtime configuration to standalone services.
7. Switch production DNS/runtime traffic only after standalone deployment verification.
8. Run the production smoke-test subset immediately after cutover.
9. Monitor Auth, API, DB, Storage, provider, payment, and application errors.
10. Keep Lovable Cloud intact as a rollback source during the observation window.

### 13. Lovable retirement — only after successful observation period

Only after independent production operation is proven:

- confirm GitHub is authoritative source control;
- confirm hosting no longer depends on Lovable;
- confirm production DB/Auth/Storage no longer depend on Lovable Cloud;
- confirm no application, webhook, cron, email, or provider path calls Lovable;
- archive useful Lovable-only operational documentation;
- remove migration helper infrastructure only after rollback/reconciliation is no longer needed;
- remove paid Lovable dependencies last.

## Cutover readiness checklist

### Complete

- [x] Identify Lovable source project.
- [x] Create isolated migration branch.
- [x] Create standalone Supabase project.
- [x] Apply all 388 repository schema migrations.
- [x] Resolve schema replay failures.
- [x] Copy initial production application-data sweep (261 tables / 19,358 rows).
- [x] Migrate 19 Auth users without recreating them.
- [x] Migrate Storage except two documented oversized draft videos.
- [x] Remove executable Lovable runtime dependency/fallback paths.
- [x] Point migration-branch application configuration at target Supabase.
- [x] Pass Lovable/source runtime endpoint guard.
- [x] Pass clean-source unit-test suite.
- [x] Pass standalone application build on Node 22.
- [x] Regenerate npm lockfile and use deterministic `npm ci` in standalone CI.
- [x] Keep target cron inactive during migration.
- [x] Retain migration/helper infrastructure for reconciliation and rollback.
- [x] Confirm target is populated.

### Required before staging acceptance

- [ ] Raise target global Storage upload limit above the remaining video size.
- [ ] Retry/copy the two remaining draft videos.
- [ ] Verify target Auth custom SMTP/email delivery.
- [ ] Verify target Auth Site URL and staging/production redirect URLs.
- [ ] Verify enabled Auth/OAuth providers.
- [ ] Configure Cloudflare staging secret store with required private provider values outside Git.
- [ ] Deploy the migration branch to an isolated Cloudflare staging environment.
- [ ] Pass the Phase 9 acceptance matrix.

### Required before production cutover

- [ ] Recreate/activate only required target cron jobs **after** staging passes.
- [ ] Run final production delta synchronization/freeze.
- [ ] Reconcile critical DB/Auth/Storage counts after final delta.
- [ ] Confirm no Lovable runtime/provider endpoints remain.
- [ ] Confirm rollback procedure and observation window.
- [ ] Switch production Cloudflare runtime/DNS to standalone deployment.
- [ ] Pass immediate post-cutover production smoke tests.

### Required before Lovable retirement

- [ ] Complete observation/rollback window without standalone-critical failures.
- [ ] Confirm no production dependency on Lovable DB/Auth/Storage/hosting/functions.
- [ ] Retire migration helpers only when rollback/reconciliation is no longer required.
- [ ] Retire Lovable subscription/dependencies only after independent production operation is proven.

## Architecture after cutover

365 Motor Sales remains independently saleable. Connections to Barangay Buddy, Drone Network, Shop Manager, and future products must use versioned APIs and stable external identifiers as defined in `docs/architecture/DATA_OWNERSHIP.md` and `docs/architecture/INTEGRATION_REGISTRY.md`.
