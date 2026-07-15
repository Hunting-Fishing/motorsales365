## Shop Manager Supabase Integration — Audit & Completion Plan

### Current state (verified against the DB)

**Schema:** `shop_manager` has 152 tables, 18 helper functions, 0 views, 0 sequences, 2 private storage buckets (`shop-receipts`, `shop-inspections`).

**RLS coverage:**
- 68 tables have policies — every table any ported route (`/shop/*`) actually queries is covered (work orders, invoices, quotes, customers, vehicles, inventory_items, payments, journal, expenses, inspections, technicians/leave, automation, discounts, etc.).
- **84 tables have RLS enabled but zero policies** — locked to `service_role`. None are referenced by ported routes today, so nothing is broken, but they're dead until we port pages that need them.

**Legacy inventory (`sm_functions.txt` = 190 fns, `sm_views.txt` = 16 views, `sm_types.txt` = 7 types):** the vast majority are from unrelated verticals in the old project (welding, gunsmith, raffle, fundraising, fitness, boat inspection, volunteer, industry surveys). Not needed.

**Ported route table refs vs. policies:** 100% overlap. `smSupabase` + shop-scoped policies work end-to-end for the pages we've ported. TypeScript regeneration was deferred (doc note); `smSupabase` is cast to `any`, so it functions today but has no type safety for `shop_manager.*`.

### What's actually missing for 100% parity

**A. Automotive-relevant Postgres functions not yet ported (7):**
```text
convert_quote_to_work_order          -- Quotes → WO conversion
convert_work_order_to_invoice        -- WO → Invoice conversion
calculate_work_order_totals_with_discounts
calculate_job_line_total_with_discounts
detect_schedule_conflicts            -- Appointments/technician scheduling
generate_quote_number                -- Quote number sequencer
generate_receipt_number              -- Payment receipt sequencer
```
Everything else in the legacy 190 is either already covered (`get_current_user_shop_id`, `has_role`, `is_admin_or_owner`, `set_updated_at`) or belongs to a vertical we're not shipping.

**B. Legacy views worth recreating (3, rest are vertical-specific):**
```text
customer_overview          -- customer + last_visit + lifetime totals
inventory_stock_view       -- items joined with on-hand/reserved qty
financial_summary_view     -- shop P&L rollup for /shop/accounting
```
Skip: `api_usage_*`, `product_catalog`, `product_details`, `schedule_coverage_summary` (from other verticals), `user_role_view`, `expiring_certificates` (already handled by `/shop/certificates` route logic), `timesheet_summary` (technician page computes inline), `system_health_view` (platform-scoped, not shop).

**C. RLS backfill for 84 currently-unlocked tables.**
None block current pages. Two options:
1. **Recommended (deferred, matches migration doc):** leave locked to `service_role`; add shop-scoped policies as each page ports. Zero risk of over-permissive policies.
2. Bulk-apply the pending `06_policies_02.sql` / `06_policies_03.sql` files in `/mnt/documents/curated/` — but these were pulled from the old multi-vertical project; many of the 84 tables are not part of the automotive Shop Manager surface (`households`, `customer_property_areas`, `service_sectors`, `part_warranties`, `inventory_forecasts`, etc.). Not worth applying blindly.

**D. Types file regeneration.**
`src/integrations/supabase/types.ts` doesn't expose `shop_manager` — `smSupabase` uses `any`. Regenerate with `--schema public,shop_manager` so ported routes get autocomplete and type errors instead of silent runtime issues.

**E. `technicians` route reference.** Ported routes hit a `technicians` table name; confirm it resolves via the technician view of `profiles`+`user_roles` and doesn't need its own table+policy.

### Plan (execution order)

1. **Migration: automotive helper functions** — add the 7 functions above as security-definer, schema-qualified, with matching triggers where legacy used them (`generate_quote_number` on `quotes.INSERT`, `generate_receipt_number` on `payments.INSERT`, `detect_schedule_conflicts` as validation on `appointments`/`technician_schedules`). Ship in one migration under `shop_manager`.
2. **Migration: three helper views** with `security_invoker=on` so RLS binds to the caller: `customer_overview`, `inventory_stock_view`, `financial_summary_view`. Grant `SELECT` to `authenticated`.
3. **Regenerate `types.ts`** to include `shop_manager`, then tighten `src/lib/shop-manager/db.ts` to drop the `any` cast where the generated types allow.
4. **Sanity check `technicians` reference** — if it's a missing table, add a shop-scoped `technicians` table+policy or update queries to use `profiles`/`user_roles`.
5. **Document deferred surface** — update `docs/SHOP_MANAGER_MIGRATION_STATUS.md` to list the 84 tables intentionally locked and the small function/view set marked "not porting" (welding/gunsmith/raffle/etc.), so future page ports know what still needs policies.
6. **Verification pass** — run `supabase--linter`, hit each of the 47 ported `/shop/*` routes for a smoke check, confirm no RLS-denied queries in console.

### Out of scope

- Porting more shop-manager pages from `src/shop-manager/**` (Phase 2 backlog — separate effort).
- Adding policies to unpolicied tables that no page uses.
- Re-creating vertical-specific legacy functions/views (welding, gunsmith, raffle, fundraising, fitness).

Say **"proceed"** and I'll ship steps 1–6 in order.
