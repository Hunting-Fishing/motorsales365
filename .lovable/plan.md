# Shop Manager Supabase Migration Plan

Move the `oudkbrnvommbvtuispla` project into this one so 365 Motor Sales and Shop Manager share one database.

## What we already have in-repo

- `shop-manager/supabase/migrations/` — **666 SQL migrations, 3.4 MB** (full schema history, RLS, functions, triggers).
- `shop-manager/supabase/functions/` — **~60 edge functions** (Stripe, email, SMS, Mapbox, AI, work orders, etc.).
- `shop-manager/supabase/config.toml` with per-function `verify_jwt` settings.

This means the schema is fully recoverable from source. The only thing we can't get from the repo is the row data — that needs a dump from the old project.

## Scope (from your answers)

- **Schema + data** — schema now from migrations, data via a `pg_dump` you export.
- **Dedicated `shop_manager` schema** — zero collision with the ~230 existing 365 tables.
- **Unified auth** — one `auth.users`, mapping table for legacy IDs.
- **Port all edge functions 1:1** as edge functions in this project's `supabase/functions/`.

## Phased approach

### Phase 1 — Schema consolidation (single migration)

Take the 666 shop-manager migrations, flatten to the current-state schema, and re-target to `shop_manager.*`:

1. Generate a consolidated schema dump from `shop-manager/supabase/migrations/` (I'll parse the SQL, apply in order to a virtual model, emit final DDL — no need to replay 666 files).
2. Rewrite `public.<table>` → `shop_manager.<table>` for every shop-manager table, function, trigger, view, type.
3. Keep any FKs to `auth.users(id)` as-is (auth is shared).
4. Add `GRANT USAGE ON SCHEMA shop_manager` + per-table `GRANT`s to `authenticated`/`service_role` (anon only where the old policies allowed it).
5. Preserve original RLS policies verbatim, retargeted to `shop_manager.*`. Add a `shop_manager.has_shop_role(_user_id, _role)` security-definer helper if the old code depended on one.
6. Skip any migration whose only job was fixing a bug that no longer exists in the consolidated schema (idempotency cleanups, one-off backfills).

Delivered as **one** `supabase--migration` call so you review the full DDL once. It will be large (~3–5k lines) but flat, not 666 files.

### Phase 2 — Data import

Lovable Cloud can't reach the old project's DB directly. You do this once:

1. From your old project's Supabase Dashboard → Database → **Backups** or via `pg_dump`:
   ```
   pg_dump "postgresql://postgres:[OLD_PASSWORD]@db.oudkbrnvommbvtuispla.supabase.co:5432/postgres" \
     --schema=public --data-only --no-owner --no-acl \
     -f shop_manager_data.sql
   ```
2. Upload the dump. I'll:
   - Rewrite `public.` → `shop_manager.` in the dump.
   - Load it via `psql` in the sandbox (or split into `supabase--insert` chunks if it's small).
   - Handle `user_id` columns: build `shop_manager.legacy_user_map(old_user_id → new_user_id)`. For rows where the legacy user hasn't signed up here yet, keep the old UUID and remap when they first sign in (trigger on first auth).
3. Verify row counts against a summary you provide from the old dashboard.

### Phase 3 — Edge functions

1. Copy every folder from `shop-manager/supabase/functions/` to this project's `supabase/functions/` — with an `sm-` prefix to avoid name collision (e.g. `sm-create-checkout-session`, `sm-send-invoice-email`).
2. Merge per-function config from `shop-manager/supabase/config.toml` into this project's `supabase/config.toml` with the new names.
3. Rewrite in each function: `Deno.env.get("SUPABASE_URL")` etc. stay (both projects use the same env var names — this project's values are now the correct ones); table refs `.from("x")` → `.from("shop_manager.x")` or use `.schema("shop_manager")` client option.
4. Audit required secrets (Stripe keys, Mapbox token, Twilio, email provider, OpenAI, etc.) — surface a list at the end for you to add via `add_secret`. **No secrets are copied** — you re-enter each one.
5. Do **not** copy `supabase/functions/_shared` blindly; merge with the existing `_shared` where present, or namespace it as `_shared_sm`.

### Phase 4 — Client wiring (later, not this migration)

Not part of this plan — call out only so you know it's coming:
- Shop-manager UI (in `shop-manager/src/`) currently uses `SUPABASE_URL = oudkbrnvommbvtuispla`. When you're ready to point that UI at this project, it'll need:
  - New URL/anon key.
  - `.schema("shop_manager")` on every Supabase call OR generated types updated to the new schema.
  - Function invocations renamed to `sm-*`.
- We'll do this as a separate task once Phases 1–3 are green.

## Risks and open items

- **Storage buckets**: the plan above doesn't move Supabase Storage objects (invoice PDFs, receipts, uploaded photos). If you need those, add a Phase 2b — I'll list buckets from the old migrations and script a copy via signed URLs. Confirm if in scope.
- **pg_cron jobs**: old project may have scheduled jobs. I'll extract from migrations and recreate here.
- **Data volume**: if the dump is >100 MB, we'll stream via `psql` from the sandbox rather than `supabase--insert`.
- **auth.users mismatch**: any FK from a shop_manager table to a legacy `auth.users(id)` that doesn't exist in this project will fail import. The `legacy_user_map` handles this, but rows for users who never re-sign-up will stay orphan-flagged.
- **Time**: Phase 1 alone will take multiple tool calls (parse → consolidate → migration → fix linter warnings). Realistic: 3–5 turns for Phase 1, 2–3 for Phase 2 once you provide the dump, 2–4 for Phase 3.

## Deliverable order

1. This plan approved.
2. I generate the consolidated `shop_manager` schema migration → you approve.
3. You export and upload the data dump → I import + verify.
4. I copy edge functions with `sm-` prefix → you add required secrets from a list I provide.
5. (Separate future task) rewire the shop-manager UI to this project.

Confirm scope on **storage buckets** (in or out) and whether you want the `sm-` prefix on edge function names or a different convention before I start Phase 1.
