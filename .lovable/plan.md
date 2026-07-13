# Shop Manager Schema Import — Safe Isolation Plan

Goal: bring the 1,036-table AllBusiness365 backend into this project under a dedicated `shop_manager` schema, with zero risk to the live 365motorsales `public` schema.

## Isolation guarantees (how "safe" is enforced)

1. **Dedicated schema.** Everything lands in `shop_manager.*`. No `CREATE`, `ALTER`, or `DROP` touches `public.*`, `auth.*`, `storage.*`, or any existing table.
2. **No cross-schema foreign keys.** FKs from source that pointed at `public.<table>` are rewritten to `shop_manager.<table>`. The only exception is `auth.users(id)` (Supabase-managed) — that stays, since both apps share the same auth pool.
3. **Rewrite pass before anything runs.** Every `public.` reference in DDL, function bodies, policy expressions, and view definitions is rewritten to `shop_manager.`. Every function gets `SET search_path = shop_manager, public` so unqualified identifiers resolve to the new schema first and can never accidentally read/write a 365 `public` table.
4. **Collision report first.** Before executing anything, I produce a diff of names shared between source `public` and current `public` (profiles, user_roles, businesses, messages, etc.) so you can confirm the rewrite covers each one. Nothing is applied until you approve the report.
5. **Grants are scoped.** `GRANT USAGE ON SCHEMA shop_manager` + table grants go only to `authenticated` / `service_role` for shop_manager objects. No grants are altered on `public`.
6. **Reversible.** The entire import is one schema. Rollback = `DROP SCHEMA shop_manager CASCADE`. Your `public` schema is never touched, so rollback cannot affect 365motorsales.
7. **RLS preserved.** All 2,841 source policies are recreated on the shop_manager tables with rewritten references. Tables ship RLS-enabled with policies from day one — no window where data is world-readable.
8. **No data yet.** This plan is schema-only (DDL). Data migration is a separate follow-up once you've verified the structure is clean.

## Execution steps

1. **Rewrite pass** on `/mnt/documents/shop_manager_schema.sql`:
   - `CREATE SCHEMA shop_manager` at top; enable required extensions (`pg_cron`, `pg_net` — `pgsodium`/`supabase_vault` already on).
   - Regex + AST-guided rewrite: `public.<ident>` → `shop_manager.<ident>` across DDL, function bodies, policy USING/WITH CHECK, view SELECTs, trigger function refs.
   - Add `SET search_path = shop_manager, public` to every function.
   - Preserve `auth.users` references untouched.
2. **Collision report** posted to chat: table/function/policy names shared with your current `public`, plus any function body that still references a bare (unqualified) identifier after rewrite. You approve.
3. **Chunked migrations** (each is a separate `supabase--migration` call you approve one at a time):
   1. `CREATE SCHEMA shop_manager` + extensions + enums + composite types
   2. Tables (no FKs yet) + sequences
   3. Foreign keys + indexes
   4. Views
   5. Functions
   6. Triggers
   7. RLS enable + policies + GRANTs to authenticated/service_role
   8. Sequence ownership + final verification query
4. **Verification** after each chunk: row-count of `information_schema` entries in `shop_manager` vs expected, and a check that `public` object counts are unchanged from a pre-migration snapshot.
5. **Data import** (separate follow-up, only after you confirm structure is good): I'll pull data via the Management API in batches, or you can provide a `pg_dump --data-only` if you prefer.

## What I will NOT do in this pass

- No frontend/route/component changes.
- No edits to any existing `public.*` table, policy, function, or trigger.
- No data copied yet — schema only.
- No changes to auth config, storage buckets, or edge functions.

## Technical notes (for reference)

- Source: `oudkbrnvommbvtuispla` extracted via Management API SQL endpoint → `/mnt/documents/shop_manager_schema.sql` (35k lines, 8,616 statements).
- Target: this project, new schema `shop_manager`.
- Shared surface: only `auth.users(id)`. No shared `public` tables, no shared functions.
- Migration tool caps chunk size, hence the 8-step split.

Say go and I'll start with the rewrite + collision report so you can eyeball it before any SQL runs.