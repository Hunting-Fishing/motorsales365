# Shop Manager — Next Polish Batch

Based on the current status (~95% overall), the last batch delivered:
- ✅ Automation execution engine (`/api/public/hooks/shop-automation-run`)
- ✅ Technician P&L drilldown (`/shop/reports/technician/$id`)

## Remaining items in this batch

### 1. Per-account GL drilldown page
`src/routes/_authenticated/shop.accounting.gl.$accountId.tsx`
- Period selector (30/60/90/YTD/custom)
- Opening balance + running balance column across all journal lines
- Debit / Credit / Net totals for the period
- Reference links back to source doc (invoice / payment / expense) where `journal_entries.source_type` is set
- CSV export of the ledger
- Wire from `shop.accounting.pnl.tsx` and `shop.journal.$accountId.tsx` (upgrade current bare drilldown into this richer view; keep the existing route path as canonical)

### 2. Leave request approval workflow
`src/routes/_authenticated/shop.leave-requests.tsx` (expand existing page)
- Approve / Reject actions on pending rows (manager/admin only)
- On approve: deduct requested days from `employee_leave_balances` for the matching `leave_type_id` inside a single server fn (transactional — reject if balance would go negative)
- On reject: capture optional reason, notify requester via existing notifications channel
- Show live balance card next to the request list
- Audit trail row per state change (approved_by, approved_at, decision_reason)

### 3. Automation admin surface
`src/routes/_authenticated/shop.automation.logs.tsx` (new)
- Table of recent runs: `ran_at`, rule name, customers scanned, reminders created, skipped-as-duplicate, errors
- Persist runs to a new `shop_manager.automation_run_logs` table (migration)
- Update cron endpoint from batch 1 to write a log row per run + per-rule summary
- Manual "Run now" button reusing existing manual trigger

### 4. Reports index polish
`src/routes/_authenticated/shop.reports.tsx`
- Link each account row on the P&L card into the new GL drilldown
- Add "Automation health" tile linking to the new logs page

## Technical notes

- Migration adds: `automation_run_logs (id, ran_at, rule_id null, customers_scanned, reminders_created, skipped_duplicate, error text null, shop_id)` with shop-scoped RLS + GRANTs for `authenticated` + `service_role`.
- Leave approval uses `requireSupabaseAuth` + `has_role` check for `manager`/`admin`; balance mutation and status update happen in one server-fn handler using a single Supabase RPC to avoid drift.
- GL drilldown reuses `smSupabase.from("journal_entry_lines")` joined to `journal_entries` and `chart_of_accounts`; running balance computed client-side after ascending fetch (bounded by period).
- No new deps.

## Out of scope (deferred)
- Per-tech P/L already shipped last batch.
- Cron scheduler wiring (still assumes pg_cron / external cron hits the endpoint; token verify already in place).
- Removing legacy `src/shop-manager/**` tree.

Say **"proceed"** to build this batch.
