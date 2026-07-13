# Shop Manager Schema Migration — Handoff Status

_Last updated: 2026-07-13_

## Where we left off

We pulled a large source Supabase project (~1,036 tables) into a new
`shop_manager` schema in this project, curated it down to 138 automotive
shop-manager tables, and split the DDL into 9 chunks in `/mnt/documents/curated/`.

### Applied ✅

| Step | File(s) | Result |
| --- | --- | --- |
| Enums | `01_enums.sql` | 22 enum types + 1 sequence |
| Tables | `02_tables_01.sql` → `02_tables_03.sql` | 138 tables in `shop_manager` |
| Foreign keys | `03_fks_01.sql` (+02) | 153 FKs wiring tables together |
| Extra indexes | `04_idx_01.sql` | 180 indexes (mostly PKs + a few perf) |
| Grants + RLS enable | `05_grants_rls_01.sql` | GRANTs to `authenticated`, `service_role`; RLS ON for all 138 tables |

### Remaining ⬜

| Step | File(s) | Notes |
| --- | --- | --- |
| RLS policies | `06_policies_01.sql`, `06_policies_02.sql`, `06_policies_03.sql` (1,195 lines total) | **Not applied.** Right now only `service_role` can read/write. |
| Frontend surfaces | — | No routes/components consume `shop_manager.*` yet. |
| Module wiring | — | Add scoped policies per module as UIs are built (work orders → customers → invoices → parts inventory …). |
| Seed data | — | No demo shop/user seeded. |

## Resume recipe

1. Verify current state:
   ```sql
   SELECT count(*) FROM pg_tables    WHERE schemaname='shop_manager';   -- expect 138
   SELECT count(*) FROM pg_policies  WHERE schemaname='shop_manager';   -- expect 0 until policies land
   SELECT count(*) FROM pg_indexes   WHERE schemaname='shop_manager';   -- expect ~180
   ```
2. Apply policy chunks in order: `06_policies_01.sql`, `_02.sql`, `_03.sql`.
3. Start wiring frontend module by module. Suggested order:
   - Work orders → customers → vehicles → invoices → parts inventory → payments.
4. For each module, add scoped policies like:
   ```sql
   USING (shop_id IN (
     SELECT shop_id FROM shop_manager.profiles WHERE user_id = auth.uid()
   ))
   ```

## Why we paused

User pivoted to fixing in-app messaging, chat, and tow notifications
(see next milestone). This doc exists so we can pick the shop-manager
pull back up without re-discovering state.
