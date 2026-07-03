# Club Member Discount (5% off internal purchases)

Give verified-club members 5% off **365-controlled** purchases only: ad packages, listing boosts, subscription tiers, passport premium, featured placements. Excludes affiliate/partner/third-party items.

## Eligibility rule

A user qualifies at checkout if **all** are true:
- Signed in
- Has at least one `club_members` row with `status = 'active'`
- That club has `status = 'active'` AND `verified = true`

Rejected clubs, pending applications, suspended clubs, and pending join requests do NOT qualify. This keeps the incentive tied to real accreditation.

## Scope: what the 5% applies to

In-scope (internal, 365-controlled):
- Ad packages / ad orders (`ad_orders`, `ad_packages`)
- Listing boosts (`listing_boosts`, `boost_products`)
- Listing bundles (`bundle_purchases`, `listing_bundles`)
- Subscription plans (`subscription_plans`, `business_plans`)
- Passport premium (`passport_premium_products`)
- Featured/promoted listings (`listing_promotions`)

Out-of-scope (never discounted):
- Affiliate links, partner products, parts marketplace sales, shop products, inspection orders paid to third-party providers, tow bids, part quotes, anything routed through outside sellers.

One discount at a time — does not stack with `customer_discounts` promo codes or staff promotions; system takes the larger of the two.

## Data model (one small migration)

New table `club_member_discount_grants` (audit/log per applied discount):
- `user_id`, `club_id`, `payment_id` (nullable link), `line_item_id`, `original_amount`, `discount_amount`, `applied_at`
- RLS: user reads own; service_role all.

New helper SQL function `public.user_has_verified_club(_user_id uuid) returns boolean` (SECURITY DEFINER) — single source of truth used by server functions and RLS.

Config row in `pricing_settings`:
- `club_member_discount_pct = 5` (so we can tune without redeploy)
- `club_member_discount_enabled = true`

## Server-side application

Discount is applied **server-side only** at checkout/order-creation server functions — never trusted from the client:
- `createAdOrder`, `createBoostPurchase`, `createBundlePurchase`, `createSubscription`, `createPassportPremiumPurchase`

Each of these:
1. Calls `user_has_verified_club(auth.uid())`.
2. If true and item is in-scope, computes `discount = round(subtotal * pct / 100)`.
3. Compares with any promo/staff discount; keeps the larger.
4. Writes to `payment_line_items` as a discount line, inserts `club_member_discount_grants` row.

## UI surfaces

- **Checkout / pricing widgets** for ads, boosts, bundles, plans, passport: show "Club member 5% off" line when eligible; show "Join a verified club to save 5%" CTA linking to `/clubs` when not.
- **`/clubs` and `/clubs/$slug`**: add perk badge "5% off 365 ads, boosts & plans" (replacing/joining the "Perks coming soon" placeholder for this specific real perk; insurance/parts discounts stay aspirational).
- **`/dashboard/clubs`**: show "Your club discount is active" chip if user qualifies.
- **`/pricing` and ad/boost landing pages**: small note "Verified club members save 5%".

## Anti-abuse

- Discount tied to `verified = true` clubs only → requires accreditation doc review, which we already gate.
- Leaving/being removed from a club revokes eligibility immediately (checked at purchase time, not cached).
- Admin can toggle `club_member_discount_enabled` off globally, or set a club's `verified = false` to revoke.
- Log every applied discount in `club_member_discount_grants` for audit and abuse review.
- No self-approval: club owner still needs admin-approved verification to unlock the perk for members.

## Policy updates (required by memory rules)

- `/terms`: add a "Club member discount" clause — 5% off internal 365 purchases only, requires active membership in a verified club, may be changed or withdrawn, does not stack, no cash value.
- `/refund-policy`: refunds computed on discounted amount.
- Bump "Last updated" on both.
- `mem://features/clubs.md`: add note that 5% internal-purchase discount is the first real perk; insurance/parts stay aspirational.

## Out of scope (v1)

- Per-club custom discount rates
- Discounts on affiliate / third-party / marketplace items
- Stacking with promo codes
- Retroactive discounts on past purchases

## Rollout order

1. Migration (`club_member_discount_grants`, `user_has_verified_club`, `pricing_settings` rows)
2. Wire discount into each in-scope server function + line-item writer
3. UI: eligibility hook + checkout line + club/pricing CTAs
4. Terms + refund policy + memory updates

## Fairness note

Yes — this pattern is common (alumni assocs, riding clubs, chambers of commerce negotiating vendor discounts for members). Because the discount is on **your own** products, there's no third party to renege, and the 5% is a real incentive without eroding margin the way affiliate rev-share would.
