## Goal

Give admins a self-serve tool at `/admin/accounts/backfill` to fill missing `phone` / `personal_email` / address columns on `profiles` in bulk (paste or CSV upload), see a per-row preview, apply changes through an audited server route, and get a verification report of exactly which fields landed.

## UX flow (4 steps in one route)

**Step 1 — Source data**
- Textarea for paste + file picker for `.csv` (up to 500 rows per submit).
- "Download template" link with example CSV.
- Row key: `user_id` (UUID) OR `email` (auth email) — either resolves the row; both is fine.
- Supported columns (all optional except the key): `phone`, `personal_email`, `street_address`, `postal_code`, `signup_region`, `signup_province`, `signup_city`, `business_address`, `business_postal_code`, `business_region`, `business_province`, `business_city`.
- Toggle: **Only fill fields that are currently empty** (default on). When off, admin overwrites existing values.

**Step 2 — Preview**
- Client parses CSV (papaparse), trims, validates: phone normalizes to E.164 (reuses same regex as `create-user.tsx`), email regex, address ≤ 200/300, postal ≤ 20.
- Calls new server route `POST /api/admin/backfill-profiles` with `dry_run: true`. Server returns `{ user_id, email, current: {…}, incoming: {…}, would_apply: string[], would_skip: string[], errors: string[] }` per row.
- UI renders a scrollable table: green cells = change, gray = skipped (already filled + skip-mode), red = validation/lookup error. Bad rows excluded from apply.
- Summary counters: `N rows, M fields to update, K errors`.

**Step 3 — Apply**
- "Apply changes" button posts same payload with `dry_run: false`.
- Server route: verifies bearer + `has_role(actor, 'admin')`, iterates rows with service-role client, normalizes phone, respects the fill-only-empty flag, writes to `profiles`, and for each changed field inserts an `account_audit_log` entry (same shape as `admin.accounts.tsx#logAudit`, `actor_role: 'admin'`, `note: 'bulk backfill'`).
- Also writes one `route_audit_log` entry via existing `logRouteAccess` helper.

**Step 4 — Verify**
- After the apply response returns, server re-selects each touched row and reports `applied: string[]`, `still_missing: string[]` per user.
- UI shows a results table with a ✓/⚠️ badge per row, and a "Download results CSV" button (columns: user_id, email, applied, still_missing, error).
- Rows with `still_missing.length > 0` stay visible with an "Add to next batch" action that repopulates step 1 with just those rows.

## Files

- `src/routes/admin.accounts.backfill.tsx` — new route (component + wizard state; admin-guarded like `admin.accounts.tsx`). Uses `useAuth`, checks `isAdmin`, otherwise renders "Admins only".
- `src/routes/api/admin/backfill-profiles.tsx` — new server route.
  - Zod body: `{ dry_run: boolean, only_fill_empty: boolean, rows: Row[] }`, `rows.length ≤ 500`.
  - Row schema mirrors the columns above; either `user_id` (uuid) or `email` required.
  - Uses same service-role admin client factory (`createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`) as `create-user.tsx`.
  - Resolves email → `auth.users.id` via `admin.listUsers` filter, or `profiles.email` lookup (fall back).
  - Returns `{ results: Array<{ user_id, email, current, applied, skipped, still_missing, errors }> }`.
- `src/routes/admin.accounts.tsx` — add a "Bulk backfill" button in the toolbar linking to the new route (small change, no logic).
- `src/components/admin/backfill/preview-table.tsx` and `results-table.tsx` — small presentational tables (optional split if the route file gets long).

## Server-side rules

- **Auth**: reject without admin role — return 403.
- **Validation**: phone E.164 normalization identical to `create-user.tsx`; drop empty strings; never overwrite `email` (auth) or `id`.
- **Audit**: one `account_audit_log` row per field change, `field: 'phone_e164'|'personal_email'|'street_address'|…`, `note: 'bulk backfill'`.
- **Idempotency**: dry-run path performs no writes.
- **Cap**: 500 rows/request; larger CSVs get "split into batches" error.
- **Never** return secrets or unrelated PII in the response.

## Verification

1. Query 5 test users missing `personal_email` and/or `phone_e164`, paste a CSV that includes them, dry-run → preview shows their current empties and the proposed values.
2. Apply → results table shows ✓ for all; DB re-check: `SELECT id, phone_e164, personal_email, street_address FROM profiles WHERE id IN (…)` returns the new values.
3. Re-run same CSV with fill-only-empty ON → results show "skipped: [phone_e164, personal_email, …]" and no audit rows created.
4. Include one bad row (invalid phone, unknown email) → preview flags it red, apply skips it, results row has an `error` string.
5. `account_audit_log` contains one row per field per user with `note = 'bulk backfill'` and correct old/new values.

## Not in scope

- No schema changes; every column already exists on `profiles`.
- No changes to the OAuth signup flow or the `signup.pending` applier.
- No email/notification to affected users about the backfill (can be added later).
