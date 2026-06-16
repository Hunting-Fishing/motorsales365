# Business workspace access + plan management

Right now a business owner has no obvious way back into their workspace, and there is no surface showing what plan they're on, how much of it they've used, or what happens when they hit the cap. This plan adds the entry points, a billing/usage hub, plan-rule enforcement, and optional auto-upgrade.

## 1. Quick-access entry points

Add a "My businesses" group everywhere the user lands:

- **Account dropdown** (`src/components/site-header.tsx`, both desktop popover ~L255 and mobile sheet ~L493): new section above "My listings" that lists each business the user owns/manages with a colored kind badge (Tow, Shop, etc.) and links straight to `/dashboard/business/$businessId`. Single business → one row; multiple → scrollable list; zero → "Register a business" CTA.
- **Welcome strip** (the "Welcome: 365 Tow Company …" line in the header): make the business name itself a link to that business's workspace, plus a small "Workspace ▾" pill that opens the same module list (Overview, Dispatch, Fleet, Staff, Inventory, Billing).
- **Dashboard home** (`src/routes/dashboard.index.tsx`): promote the existing business cards to a top-of-page rail with prominent "Open workspace" + "Billing & plan" buttons.
- **Mobile tab bar** (`src/components/mobile-tab-bar.tsx`): when the signed-in user owns ≥1 business, swap one tab for a "Workspace" tab that deep-links to their primary (or last-opened) business.

## 2. Plan, usage & billing hub

New route `dashboard.business.$businessId.billing.tsx` and matching sidebar module "Billing & plan" (added to every kind in `src/lib/business-workspace/modules.ts`). Contents:

- **Current plan card** — tier name, price, interval, status badge (Active / Past due / Cancelling), and a big "X days remaining" countdown derived from `current_period_end`. "Renews on …" / "Ends on …" copy depending on `cancel_at_period_end`.
- **Usage meters** — one progress bar per limit defined for the plan (see §3): Active listings, Staff seats, Trucks/assets, Inventory SKUs, Tow jobs this month, Storage MB. Each bar turns amber at 80% and red at 100% with a "Manage" deep-link to the relevant module.
- **Plan comparison strip** — current tier highlighted; "Upgrade" / "Downgrade" buttons open the existing `BusinessPlanDialog` prefilled with the right `typeSlug`. Downgrades that would exceed a lower tier's caps show a warning listing what must be reduced first.
- **Auto-upgrade toggle** — see §4.
- **Billing actions** — "Manage payment method / invoices" (Stripe customer portal via existing helper) and "Cancel plan".

Also surface a compact "Plan: Listed · 12 days left · 78% staff used" chip in the workspace top bar (`dashboard.business.$businessId.tsx`) that links to the billing page, and a red banner across all workspace pages when status is `past_due` or usage is at 100%.

## 3. Plan rules & limit enforcement

Plans currently have no machine-readable limits. Add them:

- Migration: extend `business_plans` with a `limits jsonb` column (e.g. `{ "staff": 3, "assets": 5, "listings": 25, "tow_jobs_month": 100, "inventory_skus": 200, "storage_mb": 500 }`) and `features jsonb` (e.g. `{ "dispatch": true, "analytics": false }`). Seed sensible defaults per existing tier (free / listed / featured / premium).
- New server fn `getBusinessPlanUsage(businessId)` in `src/lib/business-subscriptions.functions.ts` that returns `{ plan, limits, usage: { staff, assets, listings, tow_jobs_month, … }, daysRemaining, status }` by counting from `business_staff`, `business_assets`, `business_inventory_items`, `listings`, `tow_requests` (with `created_at >= date_trunc('month', now())`).
- Enforce caps server-side in the create-paths that already exist: `addBusinessStaff`, `createBusinessAsset`, `createInventoryItem`, listing create, dispatch acceptance. Each throws a typed `PlanLimitError` with `{ resource, limit, current, upgradeTo }` so the UI can show "You've hit the 3-staff limit on Listed. Upgrade to Featured for 10."
- Client helper `usePlanGuard(businessId)` to gate "+ Add" buttons (disabled + tooltip) before the server call.

## 4. Auto-upgrade

- Per-business setting stored on `business_subscriptions.metadata.auto_upgrade` (`true` | `false`, default `false`) with a toggle in the Billing hub.
- When a `PlanLimitError` fires and auto-upgrade is on, the server fn instead: looks up the next tier with capacity for that resource, calls Stripe to swap the subscription item (proration on), updates `business_subscriptions`, logs a `business_plan_change` audit row, emails the owner, and retries the original op once. If swap fails, falls back to throwing the limit error.
- A scheduled check (reuse the existing pg_cron / webhook pattern under `/api/public/`) runs nightly; if any usage > 100% for ≥24h and auto-upgrade is on, upgrades; otherwise sends a "You're over your plan limits" warning email.

## 5. Renewal & status visibility

- `getBusinessPlanUsage` returns `daysRemaining = ceil((current_period_end - now) / day)`; surface in the billing hub, the workspace chip, and the account dropdown row ("12d left").
- 7/3/1-day-before-renewal email reminder (reuse the existing transactional email infra; new template `business-plan-renewal-reminder.tsx`).
- `past_due` triggers an in-app banner + email; after 7 days the account is auto-downgraded to free with a final notice.

## Technical notes

- New migration adds `business_plans.limits jsonb`, `business_plans.features jsonb`, `business_subscriptions.metadata.auto_upgrade` (just a metadata key, no schema change), and a small `business_plan_change_log` table (business_id, from_tier, to_tier, reason, actor_user_id, created_at) with RLS scoped via `is_business_member` + `service_role`.
- New server fns in `src/lib/business-subscriptions.functions.ts`: `getBusinessPlanUsage`, `setAutoUpgrade`, `requestPlanChange`, `openBillingPortal` (wraps existing Stripe portal helper for businesses).
- New module entry in `src/lib/business-workspace/modules.ts`: `"billing"` icon `CreditCard`, available to every kind.
- Pricing dialog reused; no Stripe product changes — limits live in our DB, not in Stripe.
- Out of scope: usage-based metered billing, multi-business consolidated invoicing, team-member-level seat billing UI (caps only).

## Files touched (estimate)

- `src/components/site-header.tsx` (account menu sections)
- `src/components/mobile-tab-bar.tsx`
- `src/routes/dashboard.index.tsx`
- `src/routes/dashboard.business.$businessId.tsx` (top-bar plan chip + banner)
- `src/routes/dashboard.business.$businessId.billing.tsx` (new)
- `src/lib/business-workspace/modules.ts`
- `src/lib/business-subscriptions.functions.ts`
- `src/lib/business-staff.functions.ts`, `business-assets.functions.ts`, `business-inventory.functions.ts` (limit checks)
- `src/lib/email-templates/business-plan-renewal-reminder.tsx` (new)
- One migration for plan `limits`/`features` + change-log table + seed.
