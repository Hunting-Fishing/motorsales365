# Plan limit enforcement + auto-upgrade

Make the billing dashboard's caps real: block create paths that exceed plan limits, auto-bump the subscription when the user has opted in, and disable "+ Add" buttons in the UI when at cap.

## 1. Shared limit helper

New `src/lib/business-plan-enforcement.server.ts` (server-only):

- `PlanLimitError` class (typed: `{ limitKey, current, cap, tier, businessId }`).
- `assertWithinLimit(businessId, limitKey, increment = 1)`:
  - Loads current `business_subscriptions` row + `business_plans.limits` for the business.
  - Counts current usage for `limitKey` (reuses the same count queries already in `getBusinessPlanUsage`).
  - Throws `PlanLimitError` when `current + increment > cap` (treats `null`/missing cap as unlimited).
- `tryAutoUpgrade(businessId, limitKey)`:
  - Reads `business_subscriptions.auto_upgrade`.
  - Finds the next-higher `business_plans` row (by `sort_order` / price) whose `limits[limitKey]` accommodates the new usage.
  - Updates `business_subscriptions.plan_id` + writes a `business_plan_change_log` entry (reason `auto_upgrade`, triggered_by `system`).
  - Returns `{ upgraded: true, newTier }` or `{ upgraded: false, reason }`.
- `enforceLimit(businessId, limitKey, increment?)`: wraps assert → on `PlanLimitError`, if auto-upgrade enabled, run `tryAutoUpgrade` and re-assert; otherwise rethrow.

Stripe proration is out of scope for this step (existing subscription rows are local-only); the change log + plan swap is enough to unlock the action. A follow-up can wire Stripe `subscriptions.update` when billing goes live.

## 2. Wire enforcement into create paths

Add `await enforceLimit(...)` at the top of each handler, before the insert:

- `src/lib/business-staff.functions.ts` → `addBusinessStaffByEmail` → `enforceLimit(businessId, "staff")`.
- `src/lib/business-assets.functions.ts` → `upsertBusinessAsset` → only on insert (no `id` provided) → `enforceLimit(businessId, "assets")`.
- `src/lib/business-inventory.functions.ts` → `upsertBusinessInventoryItem` → insert-only → `enforceLimit(businessId, "inventory_skus")`.
- `src/lib/business-workspace.functions.ts` (or wherever listings/tow jobs are created from the workspace) → `enforceLimit(businessId, "listings")` / `"tow_jobs_month"`.

Each handler catches `PlanLimitError` and returns `{ error: "plan_limit", limitKey, current, cap, tier }` so the client can show a tailored toast linking to `/billing`.

## 3. Change log table

New migration adds `public.business_plan_change_log`:

- `business_id`, `from_plan_id`, `to_plan_id`, `reason` (`auto_upgrade` | `manual` | `downgrade` | `cancel`), `triggered_by` (`user` | `system`), `metadata jsonb`, timestamps.
- RLS: business owner + staff with `manage_billing` can SELECT; only `service_role` can INSERT (writes happen server-side).
- GRANT SELECT to authenticated, ALL to service_role.

Surfaced on the billing page as a "Plan history" list below usage meters.

## 4. Client-side guard

New `src/hooks/use-plan-guard.ts`:

- Wraps `getBusinessPlanUsage` query and exposes `{ atLimit, remaining, cap, tier, autoUpgrade }` per `limitKey`.
- Returns a `<LimitTooltip limitKey>` helper that renders a disabled state with "You've reached your {tier} plan's {limit} cap — upgrade to add more" linking to billing.

Apply to "+ Add staff", "+ Add asset", "+ Add inventory item", "+ New listing" buttons in the workspace routes. Buttons stay enabled when `autoUpgrade` is on (the server will handle the bump), but show a small "Auto-upgrade will apply" hint.

## 5. Billing page additions

Edit `src/routes/dashboard.business.$businessId.billing.tsx`:

- Add "Plan history" card listing the 10 most recent change-log rows (from → to, reason, when).
- When `usage[k] >= limits[k]` and `autoUpgrade` is off, highlight the meter red and show inline "Upgrade now" button next to the matching tier.

## 6. Technical notes

- All counts already exist in `getBusinessPlanUsage`; extract them into a shared `countBusinessUsage(supabase, businessId)` helper in `business-plan-usage.server.ts` so both `getBusinessPlanUsage` and `assertWithinLimit` use one source of truth.
- `tow_jobs_month` resets on `current_period_start` of the subscription — use that as the lower bound for the count.
- Auto-upgrade must be idempotent: if two parallel creates trip the cap, both call `tryAutoUpgrade`; serialize via `select … for update` on `business_subscriptions` inside a transaction (single RPC).
- No Stripe API calls in this step. When Stripe is wired later, `tryAutoUpgrade` will additionally call `stripe.subscriptions.update` with proration; the local plan swap stays the source of truth for gating.

## Files

- **New**: `src/lib/business-plan-enforcement.server.ts`, `src/lib/business-plan-usage.server.ts` (extracted helper), `src/hooks/use-plan-guard.ts`, `src/components/business-workspace/limit-tooltip.tsx`, `supabase/migrations/<ts>_plan_change_log.sql`.
- **Edited**: `src/lib/business-staff.functions.ts`, `src/lib/business-assets.functions.ts`, `src/lib/business-inventory.functions.ts`, `src/lib/business-plan-usage.functions.ts`, `src/routes/dashboard.business.$businessId.billing.tsx`, `src/routes/dashboard.business.$businessId.staff.tsx`, `src/routes/dashboard.business.$businessId.fleet.tsx`, `src/routes/dashboard.business.$businessId.inventory.tsx`.

Approve to build.
