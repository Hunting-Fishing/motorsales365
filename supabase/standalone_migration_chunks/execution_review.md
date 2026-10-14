# Migration Execution Review — Destructive / Environment / Extension Audit

**Scope:** Static review of `supabase/standalone_migration_chunks/audit.json`.  
**Purpose:** Identify statements that drop data, alter the database environment, or depend on Supabase platform extensions, project references, or URLs.  
**Method:** Text scan of existing packaged migration chunks.  
**Important:** This is a static review. No database connection was made and no SQL was executed. No source SQL was modified.

---

## Summary

| Category | Hits |
|----------|------|
| drop_table | 2 |
| drop_schema | 0 |
| drop_database | 0 |
| truncate | 0 |
| delete_from | 10 |
| alter_database | 0 |
| source_project_ref | 0 |
| supabase_co_url | 0 |
| create_extension | 7 |
| pg_net | 2 |
| cron | 44 |
| vault | 5 |

Excluded categories per request: `auth_users`, `storage_objects`, `security_definer`.

---

## drop_table (2)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql | 158 | `ALTER PUBLICATION supabase_realtime DROP TABLE public.business_inquiries;` |
| 20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql | 161 | `ALTER PUBLICATION supabase_realtime DROP TABLE public.ops_alerts;` |

---

## drop_schema (0)

No matches.

---

## drop_database (0)

No matches.

---

## truncate (0)

No matches.

---

## delete_from (10)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260510014232_email_infra.sql | 283 | `--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';` |
| 20260512035032_ca4ac263-acec-4578-ac25-6fef9210a8fe.sql | 2 | `DELETE FROM public.qr_scans a` |
| 20260518130914_a13fc071-f3d6-4cd8-8b6a-1678b388f5e0.sql | 16 | `DELETE FROM public.business_tags t` |
| 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql | 24 | `DELETE FROM auth.users WHERE id = r.id;` |
| 20260529110941_ec4ca8a5-b78c-4254-b9f4-315a9b19ef9b.sql | 4 | `DELETE FROM auth.users WHERE id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da' AND email_confirmed_at IS NULL;` |
| 20260606143803_4431c898-03ff-47a4-a84b-ffa2efba7721.sql | 2 | `DELETE FROM public.businesses a` |
| 20260608065742_3fe92331-464d-4bf6-bbd2-63b243db14a0.sql | 3 | `-- Cleanup: DELETE FROM shop_products WHERE '365-seed' = ANY(tags);` |
| 20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql | 274 | `DELETE FROM public.listings WHERE id = _listing.id;` |
| 20260711010354_064bbdf4-d81e-4437-98d9-b75c0c57afcb.sql | 82 | `DELETE FROM public.listings WHERE id = _listing.id;` |
| 20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql | 71 | `DELETE FROM public.chat_thread_members` |

---

## alter_database (0)

No matches.

---

## source_project_ref (0)

No matches.

---

## supabase_co_url (0)

No matches.

---

## create_extension (7)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260510014232_email_infra.sql | 6 | `CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;` |
| 20260510014232_email_infra.sql | 9 | `CREATE EXTENSION pg_cron;` |
| 20260510014232_email_infra.sql | 12 | `CREATE EXTENSION IF NOT EXISTS supabase_vault;` |
| 20260510014232_email_infra.sql | 13 | `CREATE EXTENSION IF NOT EXISTS pgmq;` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 1 | `CREATE EXTENSION IF NOT EXISTS pg_cron;` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 2 | `CREATE EXTENSION IF NOT EXISTS pg_net;` |
| 20260627155108_133816c5-a182-43a6-9159-d8d6d6da0491.sql | 75 | `CREATE EXTENSION IF NOT EXISTS pg_trgm;` |

---

## pg_net (2)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260510014232_email_infra.sql | 6 | `CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 2 | `CREATE EXTENSION IF NOT EXISTS pg_net;` |

---

## cron (44)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260510014232_email_infra.sql | 285 | `-- 2. CRON JOB (pg_cron)` |
| 20260510014232_email_infra.sql | 292 | `--    To revert: SELECT cron.unschedule('process-email-queue');` |
| 20260512022424_db17ca36-985d-4405-8d4a-6f8fe8e8b124.sql | 8 | `--    These are invoked by triggers, cron, or service_role only — never by app users.` |
| 20260512050915_de9fd8bd-5aec-4ebc-95ed-e4d4fe125d16.sql | 50 | `-- Only service role can call this (RLS bypass intentional for cron-driven refresh)` |
| 20260518044545_abd1298a-af7d-446a-af5e-80dd161af929.sql | 34 | `-- Service-role-only (cron-driven currency refresh).` |
| 20260518070132_6d00d33a-e6c7-497f-b015-486b9d604cc1.sql | 17 | `-- Server / cron-only` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 6 | `PERFORM cron.unschedule('expire-stale-pending-sales');` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 9 | `PERFORM cron.unschedule('refresh-fx-rates');` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 13 | `SELECT cron.schedule(` |
| 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql | 20 | `SELECT cron.schedule(` |
| 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql | 2 | `IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh-lazada-prices') THEN` |
| 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql | 3 | `PERFORM cron.unschedule('refresh-lazada-prices');` |
| 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql | 7 | `SELECT cron.schedule(` |
| 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql | 10 | `$cron$SELECT net.http_post(` |
| 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql | 14 | `) AS request_id;$cron$` |
| 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql | 37 | `PERFORM cron.unschedule('cleanup-unverified-users');` |
| 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql | 42 | `SELECT cron.schedule(` |
| 20260603063551_f1347a42-fcfe-415f-a41f-13f0f567b2be.sql | 11 | `-- Internal cron-job tokens. Service-role only.` |
| 20260603063551_f1347a42-fcfe-415f-a41f-13f0f567b2be.sql | 32 | `-- Ensure site_settings has app_url so cron jobs can read it.` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 4 | `PERFORM cron.unschedule(jobid)` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 5 | `FROM cron.job` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 11 | `SELECT cron.schedule(` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 14 | `$cron$` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 19 | `'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'ops_alerts_digest')` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 23 | `$cron$` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 27 | `SELECT cron.schedule(` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 30 | `$cron$` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 35 | `'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'refresh_lazada')` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 39 | `$cron$` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 43 | `SELECT cron.schedule(` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 46 | `$cron$` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 51 | `'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'fx_refresh')` |
| 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql | 55 | `$cron$` |
| 20260611044319_aa6847c4-a282-4892-a40f-6cdf10b8546e.sql | 6 | `CREATE POLICY "Admins read cron tokens"` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 2 | `-- Register cron token for the signup-failure-alerts hook and schedule it.` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 10 | `IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signup-failure-alerts') THEN` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 11 | `PERFORM cron.unschedule('signup-failure-alerts');` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 15 | `SELECT cron.schedule(` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 18 | `$cron$` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 23 | `'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'signup_failure_alerts')` |
| 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql | 27 | `$cron$` |
| 20260714170250_e9540d54-e006-48bd-918c-8e5033f08dab.sql | 14 | `-- Register the cron-driven automation runner token. Value is a random 32-byte` |
| 20260714170250_e9540d54-e006-48bd-918c-8e5033f08dab.sql | 15 | `-- hex string; pg_cron sends it in the x-cron-token header.` |
| 20260714172542_fe842540-f4a5-410d-a22b-db7d2530ac2c.sql | 13 | `triggered_by text NOT NULL DEFAULT 'cron'` |

---

## vault (5)

| Source migration | Line | Matching line |
|------------------|------|---------------|
| 20260510014232_email_infra.sql | 279 | `-- 1. VAULT SECRET` |
| 20260510014232_email_infra.sql | 281 | `--    vault as 'email_queue_service_role_key'.` |
| 20260510014232_email_infra.sql | 282 | `--    Uses vault.create_secret / vault.update_secret (upsert).` |
| 20260510014232_email_infra.sql | 283 | `--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';` |
| 20260510014232_email_infra.sql | 291 | `--    via net.http_post using the vault-stored service_role key.` |

---

## Notes

- The `drop_table` matches are actually `ALTER PUBLICATION ... DROP TABLE` statements, which remove tables from the Supabase Realtime publication rather than dropping the underlying table.
- Several `delete_from` matches are commented cleanup instructions, not active SQL.
- `create_extension` entries reference Supabase-managed extensions (`pg_net`, `pg_cron`, `supabase_vault`, `pgmq`, `pg_trgm`) that may require enabling in the target project.
- `cron` matches include schedule/unschedule operations and cron-token management patterns.
- `vault` matches are concentrated in the email-infrastructure migration and relate to secret storage for service-role keys.

---

*Generated from `supabase/standalone_migration_chunks/audit.json`. Static review only — no SQL executed, no database connection, no source files modified.*
