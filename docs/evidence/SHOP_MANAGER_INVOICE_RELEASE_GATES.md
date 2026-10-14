# Shop Manager invoice integrity and privileged-function release gates

Observed 2026-10-14 17:28 UTC / 2026-10-15 Asia/Manila. Source audit plus bounded
read-only catalog inspection of project `wjxaajgvddtrxxtocxen`. No business
function was invoked, customer rows read, privileges changed or live SQL applied.

## Confirmed current catalog evidence

| Function                                           | Security / owner                                | anon EXECUTE | authenticated EXECUTE | Definition MD5                     |
| -------------------------------------------------- | ----------------------------------------------- | ------------ | --------------------- | ---------------------------------- |
| `shop_manager.convert_work_order_to_invoice(uuid)` | SECURITY DEFINER / postgres, owner bypasses RLS | true         | true                  | `e590e08f9f68cc5fdead8a853af670b9` |
| `shop_manager.calculate_work_order_totals(uuid)`   | SECURITY DEFINER / postgres, owner bypasses RLS | true         | true                  | `1119dd7abe3e643d8d0c6979f19fc2a1` |

Both database roles have USAGE on `shop_manager`. Inspected function definitions
have no caller/shop/module authorization checks. The converter's `auth.uid()`
only populates `created_by`; it does not authorize access. Its existing-invoice
branch returns a supplied work order's invoice ID before calling the totals
helper. The helper independently reads job/part totals and updates the supplied
work order's totals. External Data API reachability and exploitation were **not**
tested. Do not present these catalog findings as an executed production exploit.
The MD5 values identify the observed catalog definitions; they are not migration
provenance hashes, signatures or proof of release approval.

Live `shop_manager.invoices.due_date` is NOT NULL with no default. The current
browser conversion omits that field. This is a schema compatibility blocker,
not evidence that a live customer invoice was successfully created in this run.

## Repository integrity findings

- `20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql` defines the legacy
  helpers/converter. Preserve applied source; never patch its historical body.
- The native work-order route selects `estimated_hours` and `part_name`, but
  conversion reads `j.hours` and `p.name`. Labor quantity falls back to 1 and part
  names are lost. Fixing only the missing due date would expose these later bugs.
- Browser invoice header and item inserts are separate requests; item failure or
  account change can leave a committed header. The timestamp-generated ID changes
  on retries; no work-order invoice link is recorded, so repeat conversion is not
  idempotent. The isolation slice now refreshes possible partial headers and
  warns to inspect them before retrying; this does not provide atomicity.
- The old database converter is atomic for its inserts/link, but it checks
  `invoice_id` before locking the work order. Concurrent calls can create more
  than one invoice. The helper's later UPDATE lock does not recheck that decision.
- The old converter also changes draft/zero-tax behavior to unpaid plus fixed
  12% tax. That can activate posting triggers; it is not a safe drop-in replacement.
  Do not assume tax eligibility or approve accounting policy from this audit.
- Both paths omit source `inventory_item_id` from invoice items. Migration
  `20260715020120_bc5cc45c-4d3d-4e90-a555-cf44d6e11086.sql` skips invoice stock/COGS
  processing for null inventory links. Determine the one authorized stock-consumption
  point before copying this field, to avoid double consumption elsewhere.
- Inspection header/checklist creation is also non-atomic. The child-card slice
  checks formerly ignored errors, avoids false success, refreshes the scoped list
  and warns before retrying. It does not delete partial headers or undo writes.

## Next release dependency, before expanding commercial activity

1. Obtain a scoped production containment decision. The owner was asked about
   restricting the legacy converter after impact tests and rollback preparation.
   The totals helper is an additional related access risk; do not silently expand
   any approval for one function to all functions or change live permissions now.
2. Inventory call sites and effective grants, nested functions/triggers and API
   exposure. Refresh catalog definitions/grants immediately before a release;
   retain the exact ACL pre-state and a reviewed recovery path.
3. Build a forward-only hardened converter on disposable PostgreSQL/Supabase.
   Verify active account/shop/module rights, lock the work order **before** the
   idempotency check, use authoritative line rows, set required dates and preserve
   reviewed draft billing policy. Commit header/items/work-order link together.
4. Require anonymous/cross-shop denial, correctly mapped labor/parts, item-failure
   rollback, concurrent/repeated requests returning one invoice, exact monetary
   arithmetic, and no unintended posting/stock effects. Reconcile migration
   provenance and baseline/rollback readiness before any live application.
5. Only then wire the native UI to the authorized atomic operation. Do not call
   the legacy converter merely because it exists or unit/build tests pass.

No containment or schema release is approved by this document. Continue other
safe in-scope implementation while production authority/release readiness is
pending. Related public legacy helpers need a separate bounded authorization
audit; this is not a full schema security certification.

Primary guidance: [Supabase database-function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker)
and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
Current changelog was checked; no platform/extension upgrade is performed.
