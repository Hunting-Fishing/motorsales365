## Shop Manager import — status check

**Live in the `shop_manager` schema right now:**
- 138 tables (all curated automotive domains — customers, vehicles, work orders + job lines/parts/time/history, invoicing + payments, quotes, inventory + suppliers + purchase orders, appointments + scheduling, employees + shifts, shops + settings, service templates, discounts, vendor bills). This matches the curated set exactly.
- 22 enum types, 180 indexes (primary keys + defaults).

**Not yet applied (still queued in `/mnt/documents/curated/`):**
- Foreign keys — `03_fks_01.sql`
- Extra indexes — `04_idx_01.sql`
- Grants + RLS enable — `05_grants_rls_01.sql`
- RLS policies (3 chunks) — `06_policies_01.sql` … `06_policies_03.sql`

Right now: 0 FKs, 0 RLS-enabled tables, 0 policies. Tables are physically present but not yet safe to expose to the app — a client hitting them would either get permission errors (no grants) or unrestricted access once grants land (no RLS).

### Plan to finish the pull

Apply the remaining chunks in this order, one migration each:

1. `03_fks_01.sql` — foreign keys between the 138 tables.
2. `04_idx_01.sql` — remaining performance indexes.
3. `05_grants_rls_01.sql` — GRANTs to `authenticated` / `service_role` and `ENABLE ROW LEVEL SECURITY` on every shop_manager table.
4. `06_policies_01.sql` — RLS policies part 1.
5. `06_policies_02.sql` — RLS policies part 2.
6. `06_policies_03.sql` — RLS policies part 3.

After each apply I'll re-run the counts query so you can see FKs / policies / rls_enabled climb, and I'll report the final totals at the end. No app code changes in this plan — schema only. Live `public` schema and 365motorsales app remain untouched.

If a chunk is over the migration size limit I'll split it in-place and keep going in the same turn.