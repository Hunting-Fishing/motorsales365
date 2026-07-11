## Fix 8 critical RLS findings, then publish

### Goal
Close all 8 cross-tenant data leaks the security scanner flagged, then ship to `allbusiness365.com`.

### Single idempotent migration
One migration drops every offending `USING (true)` / anon-write policy and replaces it with the standard `shop_id = public.get_current_user_shop_id()` pattern already used across the project. Each statement is wrapped in `DO` / `DROP POLICY IF EXISTS` so it's safe to re-run.

### Tables fixed

| # | Table | Fix |
|---|---|---|
| 1 | `audit_logs` | Drop `Authenticated users can view audit logs` (USING true). Keep existing admin/owner-scoped policy. |
| 2 | `customer_interactions` | Drop `Enable full access to customer_interactions`. Add shop-scoped ALL policy via `get_current_user_shop_id()`. |
| 3 | `equipment_future_plans` | Drop `Anyone can view equipment future plans`. Add shop-scoped SELECT for authenticated users. |
| 4 | `follow_ups` | Drop the 3 `USING (true)` view/insert/update policies. Add shop-scoped ALL policy. |
| 5 | `shop_settings` + `company_settings` | Drop the `auth.role() IN ('authenticated','anon')` policies. Add shop-scoped ALL policy (authenticated only). |
| 6 | `work_order_job_lines` | Drop the 4 `USING (true)` policies. Existing shop-scoped policy remains. |
| 7 | `work_order_parts` | Drop `Enable read access for all users`. Existing shop-scoped policies remain. |
| 8 | `work_order_time_entries` | Drop `Allow all access to work_order_time_entries`. Existing user/shop-scoped policies remain. |

All replacement policies use the existing `public.get_current_user_shop_id()` security-definer function — no new functions, no schema changes, no app-code changes.

### Verification
1. Re-run `security--get_scan_results` — all 8 error-level findings should clear.
2. Smoke-check `/automotive`, `/shop-manager`, and a work-order detail page in preview to confirm nothing read-broke (existing shop-scoped policies already cover the legitimate access paths).
3. Publish.

### Not in scope (the 5 warnings)
`business_industries`, `customer_referrals`/`referral_transactions`, `discount_audit_log`, `diy_bay_rate_history`, Realtime channels, leaked-password protection. These don't block publish. I can do them in a follow-up pass if you want — say the word.

### Risk
Low. Every replacement policy is the same pattern used by ~400 other policies in this DB. If a legitimate flow breaks (unlikely), the fix is to add a missing `shop_id` on the offending insert path — not to roll back the policy.
