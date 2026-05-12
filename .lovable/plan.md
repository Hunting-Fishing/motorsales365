## Goal
Improve the Staff QR Referrals admin page with safer status changes, better at-scale management, and a more usable audit log.

## Changes (all in `src/routes/admin.referrals.tsx` unless noted)

### 1. Confirm + reason dialog for activate/deactivate
- Replace the direct `toggleActive` call on the Power button with an `AlertDialog` that:
  - Shows the staff name, code, and the action ("Deactivate" / "Reactivate").
  - Includes a required `Textarea` for **reason** (min 3 chars).
  - On confirm: update `staff_referrals.active`, then insert a manual row into `staff_referral_audit` with `action = 'deactivated' | 'activated'` and `details = { reason, referral_code, full_name }`.
  - The existing `tg_staff_referral_audit` trigger also logs activation changes, so the manual insert uses a distinct action label suffix (e.g. `deactivated_with_reason`) OR we keep one entry by adding the reason via the trigger path. Simpler: keep trigger entry + insert a second `reason_logged` entry containing the reason (no DB migration needed).
- Toast on success/failure.

### 2. Search box for staff list
- Add a debounced text input above the table that filters `filteredRows` by case-insensitive match on `full_name`, `email`, or `referral_code`.

### 3. Sortable columns + pagination on Staff table
- Add `sortKey` (`name | email | code | role | status | created`) and `sortDir` (`asc | desc`) state. Clickable `TableHead` with arrow indicator.
- Add `page` + `pageSize` (default 25; selector for 25/50/100). Render `Page X of Y`, Prev/Next buttons. Resets to page 1 when filters/search/sort change.
- Sorting/pagination applied after filter+search on the existing `filteredRows` memo.

### 4. Audit log filters
- Add controls in the audit panel:
  - Action type select (all, created, activated, deactivated, qr_generated, sync_run, deleted, reason_logged).
  - Admin actor select (populated from distinct `actor_id`s in current audit set, displayed via profiles map already available — fetch profile names for actors).
  - Date range: two date inputs (from / to).
- Re-query `staff_referral_audit` using `.gte/.lte('created_at', …)` and `.eq('action', …)` / `.eq('actor_id', …)` server-side; keep limit 200. Refetch when filters change.

## Technical notes
- No database migration needed. All audit entries continue to flow through existing triggers + manual inserts; the reason is stored in `details` JSONB.
- All new UI uses existing shadcn primitives: `AlertDialog`, `Textarea`, `Input`, `Select`, `Button`, `Table`.
- Keep work scoped to `src/routes/admin.referrals.tsx`.
