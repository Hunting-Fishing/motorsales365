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

Target organization: **366 Industries AI Platform**  
Target region: **Singapore (`ap-southeast-1`)**

## Absolute safety rules

- Never modify `main` as part of this migration. Use `migration/standalone-supabase-365` until cutover is explicitly approved.
- Do not delete, alter, pause, or write to the Lovable source database during migration work.
- Do not truncate or rebuild destination production data.
- Do not recreate migrated Auth users.
- Never print, commit, or log service-role keys, database passwords, OAuth secrets, payment secrets, webhook secrets, provider credentials, or other private API credentials.
- Never add a fallback call to Lovable. Missing external-provider credentials must disable/fail that feature cleanly.
- Keep target cron jobs disabled until standalone application endpoints have passed staging smoke tests.
- Preserve migration/helper infrastructure and the Lovable rollback source until post-cutover validation is complete.
- Treat production writes during the migration window as a final synchronization/cutover concern. Do not assume the initial copy remains current.

## Current standalone migration checkpoint

### Application / GitHub

- Working branch: `migration/standalone-supabase-365`.
- Standalone runtime CI is green at commit `47ba2c045e9fd4dc84a7a4583e4f66d49757fb84`.
- CI currently proves all of the following together:
  - clean-source unit tests pass;
  - executable runtime source is guarded from the Lovable source project / Lovable API endpoints;
  - the standalone application build succeeds on Node 22;
  - migration SQL chunks pass their safety/build gate.
- The intentional legacy QR rescue detector remains allowed to recognize old printed Lovable-preview QR hosts locally. It is compatibility parsing only and is not a runtime fallback to Lovable.
- The application uses Cloudflare Workers/TanStack server routes. No production Cloudflare cutover has occurred from this migration branch.
- Public client configuration points to the standalone target; server/provider secrets must remain in the deployment secret store, never Git.
- The repository lockfiles are currently behind `package.json`. CI therefore installs declared dependencies with `npm install --legacy-peer-deps`. Deterministic lockfile/package-manager normalization remains a pre-production engineering cleanup item and must not be disguised by switching CI to `npm ci` before the lock is actually corrected.

### Schema / database

The original schema replay completed successfully. The target has since gained migration/helper objects, so current-state counts are recorded separately from the historical replay checkpoint.

Current target state:

- 263 public base tables.
- 272 public functions.
- 704 public RLS policies.
- 31 storage buckets.
- 0 public base tables with RLS disabled.
- 0 unvalidated public foreign-key constraints.
- 0 active target cron jobs.
- No stored public function/procedure or view dependency on the Lovable source project was found in the migration audit.

Historical schema-replay checkpoint:

- 388 / 388 repository migrations successfully applied.
- 0 unresolved migration failures.
- Historical replay counts were 260 public base tables, 269 public functions, and 703 public RLS policies before migration/helper objects were subsequently added.

Historical migration failures were repaired and successfully replayed. Repairs were limited to source-schema prerequisites that existed in Lovable but were missing from checked-in migration history, including organization infrastructure, organization references, shop category hierarchy, and required business-type reference rows.

### Production data copy

The production-data sweep has completed on the target:

- 261 public tables were included in the application-data migration sweep.
- 19,358 application rows were copied during that sweep.
- Key target spot checks currently include:
  - 19 `auth.users` records;
  - 19 `public.profiles` records;
  - 3 active `public.listings` records;
  - 4 `public.businesses` records;
  - 15,487 `public.email_send_log` records.

These counts prove the target is populated; they are **not** a substitute for a final delta synchronization immediately before cutover.

### Auth

- 19 Auth users have been migrated to the standalone target.
- Do not recreate these users.
- Profile linkage exists for the 19 migrated profiles.
- Standalone listener-first Auth bootstrap and recovery regression tests pass in CI.
- Target Auth SMTP / mail delivery configuration is **not yet accepted as cutover-ready**.
- Before staging acceptance, verify in the target Supabase dashboard:
  - custom SMTP/provider configuration;
  - production Site URL;
  - staging and production redirect URLs;
  - confirmation-email behavior;
  - password-reset behavior;
  - OAuth provider configuration if any provider is enabled.
- A successful user-table migration does not prove confirmation/reset email delivery.

### Storage

Storage migration is substantially complete. Two oversized draft videos remain absent from the standalone target:

```text
listing-videos/drafts/66beaa5c-a1d6-4a24-a6c0-ce6cb5d79f7f/fb46125a-5702-4e3b-a238-ac8de8ebca7f/VIDEO-2026-08-25-01-04-28.mp4
listing-videos/drafts/66beaa5c-a1d6-4a24-a6c0-ce6cb5d79f7f/fb46125a-5702-4e3b-a238-ac8de8ebca7f/VIDEO-2026-08-25-01-04-26.mp4
```

Each is approximately 86.5 MiB / 90.7 MB.

Verified storage findings:

- The target `listing-videos` bucket has no bucket-specific `file_size_limit`.
- The target organization is on Supabase Pro.
- The remaining upload failure is therefore a project-level/global Storage file-size setting, not a per-bucket rule or Free-plan ceiling.
- Raise the standalone project's global Storage upload limit to comfortably above ~91 MB (for example at least 100 MB) before retrying those two objects.
- Do not remove migration storage-copy infrastructure until these objects are either copied successfully or explicitly documented as intentionally excluded.

### Migration helper infrastructure

The target still contains JWT-protected migration/helper Edge Functions, including:

- `legacy-migration-bootstrap`
- `migration-source-pull`
- `migration-source-preflight`
- `migration-lovable-source-check`
- `migration-storage-copy`
- `migration-auth-sync`
- `migration-auth-encrypted`
- `migration-public-large-storage-copy`

Migration helper state observed during validation includes:

- `public.migration_auth_transfer_keys`: 0 rows.
- `public.migration_ingest`: 450 rows.

Keep these helpers until cutover has succeeded and the rollback window has closed.

`email_queue_dispatch` was intentionally **not** migrated because its source implementation called Lovable-only email infrastructure. Standalone email dispatch must use the independently configured provider path and must never fall back to Lovable.

### Cron

- There are currently **0 active cron jobs** on the standalone target.
- This is intentional.
- Do not activate or recreate production recurring jobs until staging endpoints have passed the smoke-test gate below.

### Security-advisor checkpoint

Supabase's advisor reports inherited findings from the source schema, including SECURITY DEFINER/search-path concerns and RLS-enabled objects that require policy review.

These are not treated as migration-copy failures because parity and runtime compatibility are the immediate objective. Do not blindly harden historical objects during cutover. Review each finding after application compatibility testing and commit any required fix as a new standalone migration.

## Migration phases and status

### Phase 1 — Inventory

Record:

- Lovable source project reference.
- GitHub migration history under `supabase/migrations/`.
- Public tables, views, sequences, functions, triggers, extensions, and RLS policies.
- Auth providers, redirect URLs, templates, and user counts.
- Storage buckets, policies, and object counts.
- Realtime configuration.
- Edge/backend functions and required secret **names**.
- External services and webhooks.
- Frontend/backend environment-variable names.

**Status: substantially complete; provider/deployment secret-name inventory should be kept current through staging.**

### Phase 2 — Provision target

Create a dedicated standalone Supabase project for 365 Motor Sales.

Do not place 365 Motor Sales data in another product database and do not share its service-role credentials with another product.

**Status: complete.**

### Phase 3 — Rebuild schema

Apply the repository's Supabase migration history to the target in chronological order and validate RLS, constraints, functions, policies, triggers, extensions, and grants.

**Status: complete.**

### Phase 4 — Copy production data

Copy application data with primary keys and timestamps preserved where required. Validate row counts and high-value aggregates. Record exceptions instead of silently dropping rows.

**Status: initial production-data sweep complete. Final delta synchronization is still required before cutover.**

### Phase 5 — Auth

Migrate supported Auth identity data without recreating users, then verify login/session/confirmation/reset/provider behavior against the standalone project.

**Status: 19 users migrated; application Auth regression suite green; target SMTP/Site URL/redirect/provider configuration still requires staging acceptance.**

### Phase 6 — Storage

Recreate required buckets/policies and copy objects while preserving paths.

**Status: substantially complete; two oversized draft videos remain blocked by the global project upload-size setting.**

### Phase 7 — Backend services and secrets

Recreate required server functions and provider integrations on infrastructure owned outside Lovable.

Rules:

- Document secret **names**, not values.
- Store values only in Cloudflare/Supabase/provider secret stores.
- Missing optional provider credentials must disable/fail the feature cleanly.
- Never fall back to Lovable.

**Status: standalone runtime paths are build-validated; deployment secret-store configuration remains required for staging.**

### Phase 8 — Application configuration

Use the target project URL/reference and standalone publishable configuration. Never expose service-role credentials in browser code.

**Status: branch configuration targets standalone Supabase; production deployment has not been switched.**

### Phase 9 — Staging deployment and acceptance tests

Deploy the migration branch to an isolated Cloudflare staging environment with standalone secrets configured outside Git.

Minimum acceptance checks:

1. Homepage renders from standalone runtime.
2. Public listings load from the target database and the known active listings are reachable.
3. Listing detail pages render images/video paths from target Storage.
4. Existing-user login works against standalone Auth.
5. Logout and session refresh/recovery work.
6. Confirmation/reset mail flow is verified using a controlled test path that does not recreate migrated users.
7. Listing create/edit/delete works with RLS enforced.
8. Photo/video upload and retrieval works, including configured maximum video size.
9. Business profile create/edit works.
10. Directory/map workflows work.
11. Referral/QR attribution works, including legacy QR rescue behavior without calling Lovable.
12. Shop Manager critical workflows work against the standalone target.
13. Admin permissions and role gating work.
14. Transactional email/provider paths work without Lovable.
15. Stripe/payment flows are exercised in an appropriate safe/test mode and webhook configuration is verified.
16. RLS negative tests prove one user/business cannot read or modify another user's private records.
17. Application and provider logs show no calls to the Lovable source project.

**Gate:** do not activate target cron jobs until this phase passes.

### Phase 10 — Recreate required scheduled jobs

After staging endpoints pass:

1. Inventory source recurring jobs and determine which are still required.
2. Recreate only the required standalone equivalents.
3. Confirm each job calls standalone application/provider endpoints only.
4. Activate cautiously and observe one or more executions.
5. Leave obsolete Lovable-only jobs retired.

**Status: not started; zero active target cron jobs is currently correct.**

### Phase 11 — Security hardening

After compatibility validation, review inherited Supabase advisor findings. Prioritize:

1. SECURITY DEFINER views exposed through the public schema.
2. SECURITY DEFINER functions executable by roles that do not require them.
3. Mutable function `search_path` warnings.
4. RLS-enabled tables with missing/inadequate tenant policies.
5. Extension placement and grant warnings.

Each change must be application-tested and committed as a new standalone migration rather than silently mutating historical migrations.

### Phase 12 — Final synchronization and cutover

Immediately before production switch:

1. Define/freeze the production write window as required.
2. Run the final Lovable-source-to-standalone **delta** synchronization using the retained migration infrastructure.
3. Reconcile high-value row counts, Auth count, and Storage exceptions.
4. Confirm the two oversized videos are copied or explicitly accepted as exclusions.
5. Confirm staging remains green after the final delta.
6. Switch production Cloudflare environment/runtime configuration to standalone services.
7. Switch DNS/runtime traffic only when the standalone deployment is verified.
8. Execute the production smoke-test subset immediately after cutover.
9. Monitor Auth, API, database, Storage, provider, payment, and application errors.
10. Keep Lovable Cloud intact as a rollback source during the observation period.

### Phase 13 — Lovable retirement

Only after successful standalone production operation and rollback-window completion:

- Confirm GitHub is authoritative source control.
- Confirm production hosting no longer depends on Lovable.
- Confirm production database/Auth/Storage no longer depend on Lovable Cloud.
- Confirm no application, webhook, cron, email, or provider path calls Lovable.
- Export/archive Lovable-only operational documentation worth preserving.
- Remove migration helper infrastructure only after it is no longer required for rollback/reconciliation.
- Remove paid Lovable dependencies only after independent production operation is proven.

## Cutover readiness checklist

### Complete

- [x] Identify Lovable Cloud source project reference.
- [x] Create isolated migration branch.
- [x] Create standalone 365 Motor Sales Supabase project.
- [x] Apply all 388 repository schema migrations.
- [x] Resolve migration replay failures.
- [x] Copy the initial production application-data sweep (261 public tables / 19,358 rows).
- [x] Migrate 19 existing Auth users without recreating them.
- [x] Migrate Storage except for the two documented oversized draft videos.
- [x] Remove executable Lovable runtime dependency/fallback paths from the standalone application.
- [x] Point standalone application configuration at target Supabase.
- [x] Pass standalone runtime endpoint guard.
- [x] Pass clean-source unit-test suite.
- [x] Pass standalone application build in CI.
- [x] Keep target cron jobs inactive during migration.
- [x] Keep migration/helper infrastructure available for reconciliation/rollback.
- [x] Confirm target project is healthy and populated.

### Required before staging acceptance

- [ ] Raise target global Storage upload limit above the size of the two remaining draft videos.
- [ ] Retry/copy the two remaining draft videos.
- [ ] Verify target Auth custom SMTP/email delivery.
- [ ] Verify target Auth Site URL and staging/production redirect URLs.
- [ ] Verify any enabled Auth providers/OAuth configuration.
- [ ] Configure Cloudflare staging secret store with required provider secret values outside Git.
- [ ] Normalize package manager/lockfile strategy or explicitly accept the temporary CI install strategy for staging.
- [ ] Deploy the standalone migration branch to an isolated Cloudflare staging environment.
- [ ] Pass the Phase 9 staging acceptance test matrix.

### Required before production cutover

- [ ] Recreate/activate only required target cron jobs **after** staging passes.
- [ ] Run final production delta synchronization/freeze.
- [ ] Reconcile critical database/Auth/Storage counts after final delta.
- [ ] Confirm no Lovable runtime/provider endpoints remain.
- [ ] Confirm rollback procedure and observation window.
- [ ] Switch production Cloudflare runtime/DNS to standalone deployment.
- [ ] Pass immediate post-cutover production smoke tests.

### Required before Lovable retirement

- [ ] Complete observation/rollback window without standalone-critical failures.
- [ ] Confirm no production dependency on Lovable database/Auth/Storage/hosting/functions.
- [ ] Retire migration helper infrastructure only when rollback/reconciliation is no longer needed.
- [ ] Retire Lovable subscription/dependencies only after independent production operation is proven.

## Architecture after cutover

365 Motor Sales remains independently saleable. Connections to Barangay Buddy, Drone Network, Shop Manager, and future products must use versioned APIs and stable external identifiers as defined in `docs/architecture/DATA_OWNERSHIP.md` and `docs/architecture/INTEGRATION_REGISTRY.md`.
