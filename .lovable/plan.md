# Tiered Plans, Founding Members & Sales Console

## 1. Rename plans + bump Free perks

Update `subscription_plans` rows (keep IDs, just rename + adjust):

| Old name | New name | Price (₱) | Listings/mo | Photos/listing |
|---|---|---|---|---|
| Free | Free | 0 | 1/week | **3** (was 1) |
| Starter | Bronze | 80 | 5 | 5 |
| Growth | Silver | 150 | 10 | 8 |
| Pro | Gold | 280 | 20 | 12 |
| Unlimited | Platinum | 500 | ∞ | 20 |
| — | **Business** (new) | 1,200 | ∞ | 20 + multi-user, priority badge |

Add `max_photos_per_listing` column to `subscription_plans` so the limits are data-driven instead of hardcoded.

## 2. Founding Members (first 1,000 users)

- Add boolean `profiles.is_founding_member` + `founding_member_number` (int).
- Trigger on profile insert: if total founding members < 1000, set `is_founding_member=true` and assign next number.
- Auto-create a lifetime **Bronze** subscription (status `active`, `current_period_end = null`, `price_php = 0` override flag).
- New column `subscriptions.complimentary` (bool) so we know it's a perk, not paid.
- Profile/dashboard shows a "Founding Member #123" badge.

## 3. Photo limits — make data-driven

Replace hardcoded `maxPhotos` in `src/routes/sell.tsx` and `src/routes/listing.$id.edit.tsx` with a helper `getUserPlanLimits()` that reads the user's active subscription plan (falls back to Free = 3 photos).

## 4. New `sales` role

- Add `'sales'` to `app_role` enum.
- New helper `has_role(uid,'sales')`.
- RLS: sales can SELECT all profiles, subscriptions, payments, listings; can UPDATE `subscriptions` (change plan, apply discount, pause), `profiles.account_status`, but cannot grant roles or edit `pricing_settings` / `subscription_plans`.

## 5. Account pause

- Add `profiles.account_status` enum: `active | paused | banned`.
- RLS update on `listings`: public SELECT requires owner's `account_status='active'`.
- Pausing flips status; unpausing restores. Listings rows are not modified.

## 6. Per-account discounts

- New `subscriptions.discount_percent` (numeric, 0–100) — sales-editable.
- Billing UI shows discounted price; payments table records the applied discount.

## 7. Sales/Admin Accounts console

New route **`/admin/accounts`** (visible to admin + sales) with:
- Searchable table: name, email, plan tier badge, founding-member badge, status, joined, MRR, lifetime spend.
- Filters: tier, status, founding member, business kind, region.
- Per-row actions:
  - Change plan (dropdown of tiers)
  - Apply discount % (with reason note)
  - Pause / Unpause account
  - Add complimentary months
  - View activity (link to existing analytics)
- CSV export.

Add "Accounts" entry in `src/routes/admin.tsx` nav. Hide admin-only items (Make admin, Pricing edit) for sales role.

## 8. Auth context

Extend `use-auth.tsx` to expose `isSales` alongside `isAdmin`. Admin route guard accepts admin OR sales.

---

## Technical changes

**Migration 1 — schema:**
```sql
ALTER TYPE app_role ADD VALUE 'sales';
CREATE TYPE account_status AS ENUM ('active','paused','banned');
ALTER TABLE profiles
  ADD COLUMN account_status account_status NOT NULL DEFAULT 'active',
  ADD COLUMN is_founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN founding_member_number int UNIQUE;
ALTER TABLE subscription_plans ADD COLUMN max_photos_per_listing int DEFAULT 5;
ALTER TABLE subscriptions
  ADD COLUMN complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN paused_at timestamptz,
  ADD COLUMN notes text;
```

**Migration 2 — data:** rename plans, set `max_photos_per_listing` (Free=3, Bronze=5, Silver=8, Gold=12, Platinum=20, Business=20), insert Business plan.

**Migration 3 — founding member trigger** on `profiles` AFTER INSERT; assigns number if count<1000 and inserts complimentary Bronze subscription.

**Migration 4 — RLS:** update `listings` public-read policy to require active owner; add sales policies on profiles/subscriptions/payments; update `has_role` is unchanged but called with `'sales'`.

**Files to edit / create:**
- `src/hooks/use-auth.tsx` — add `isSales`
- `src/routes/admin.tsx` — guard accepts sales, conditional nav
- `src/routes/admin.accounts.tsx` (new) — accounts console
- `src/routes/sell.tsx`, `src/routes/listing.$id.edit.tsx` — read photo limit from plan
- `src/lib/plan-limits.ts` (new) — `getUserPlanLimits(userId)` helper
- `src/routes/dashboard.profile.tsx` — show Founding Member badge
- `src/routes/pricing.tsx`, `src/components/site-footer.tsx` — new tier names
- `src/routes/admin.users.tsx` — allow sales (read-only verify/role buttons hidden)

## Out of scope
- Actual payment processor changes for the new Business tier (will use existing manual-payment flow).
- Email notifications when sales pauses/discounts an account (can add later).
- Multi-user seats for Business tier (stub the feature flag only).