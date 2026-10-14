# Standalone Supabase migration closure

Closure date: 2026-09-11  
Source snapshot: `jfjrnjyroxvlydajvndl`  
Production project: `wjxaajgvddtrxxtocxen`

## Ten-gate result

| Gate | Result | Evidence |
| --- | --- | --- |
| 1. Source and target inventory | PASS | The retained source manifest contains 388 migrations in seven batches. Target has 286 public tables, 10 public views, 164 shop_manager tables, and 5 shop_manager views. |
| 2. Schema and row reconciliation | PASS | All 269 captured source public relations exist in target. 243 have exact row counts, 26 have additional post-cutover rows, and none have fewer rows. Captured source rows: 20,458; target rows in the same relations: 22,048. |
| 3. Functions, triggers, and extensions | PASS | Target contains 299 public routines, 55 shop_manager routines, 248 public triggers, 29 shop_manager triggers, and all required extensions: pg_cron, pg_net, pgmq, supabase_vault, and pg_trgm. |
| 4. RLS and direct grants | PASS for migration closure | No RLS-enabled relation without a policy has a usable anon/authenticated table grant. The temporary migration tables now have forced RLS and no anon/authenticated privileges. Remaining advisor notices are tracked application-security work, not missing migration data. |
| 5. Auth identities | PASS | All 19 captured source Auth users are present. Target has 21 users after legitimate post-cutover additions. |
| 6. Storage | PASS | All 103 captured source objects are present, including the two objects previously blocked by a source-plan limit. Target now has 31 buckets and 130 objects. |
| 7. Runtime project references | PASS for Supabase | Production environment and server client point to `wjxaajgvddtrxxtocxen`; `supabase/config.toml` now points to the same project. |
| 8. Scheduled jobs and integrations | PASS for cutover safety | Fourteen imported cron definitions exist, all inactive, and none references the source project or lovable.app. They remain intentionally inactive until each job's credentials and duplicate-scheduler risk are individually verified. |
| 9. Application build and migration ingress | PASS | The Cloudflare production build completes. Both public migration routes now return HTTP 410, and anonymous migration-inbox access is revoked. |
| 10. Rollback and retirement evidence | PASS | Source manifests and the sealed migration archive are retained for evidence. Only service-role operations can access the archive. The old project must not be deleted until an owner-approved retention window expires. |

## Security boundary

This closes the **Supabase data-platform migration**. It does not claim that every optional third-party integration has been replaced. AI, Maps, Stripe connector, Google OAuth wrapper, and legacy email compatibility code still include Lovable packages or gateway URLs. Those integrations must be replaced feature-by-feature and tested before their dependencies are removed; deleting them as part of database closure could break working application features.

## Operational rules

- New schema changes go only through versioned migrations in this repository.
- Production Supabase CLI commands must resolve to `wjxaajgvddtrxxtocxen`.
- Do not reopen anonymous access to `migration_ingest`.
- Do not activate imported cron jobs until ownership, credentials, idempotency, and duplicate execution are verified.
- Do not delete the sealed archive or old source project without a dated backup and explicit owner approval.
