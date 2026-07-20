
# Shop Manager Tiering & Global Pricing Strategy

Ship a 4-tier Shop Manager plan structure (Free / Starter / Pro / Enterprise) per business type, with all-inclusive AI/API usage bundled into each paid tier, priced in PHP as the base and auto-adjusted per region using purchasing power parity (PPP). Free-tier users see the full app UI but with locked/greyed controls and upgrade CTAs.

## Strategy summary

- **4 tiers, per business type.** Each business kind (repair, fuel, dealership, tow, parts retailer, service shop, etc.) shares the same tier ladder but with tier caps tuned to its workload (e.g. a fuel station's SKU cap ≠ a dealership's listing cap).
- **All-inclusive AI/API pricing** — no metering, no surprise bills. AI budget is baked into the monthly fee; abuse is contained by fair-use ceilings enforced server-side. Simpler sales pitch for global expansion.
- **PPP regional pricing.** PH is the anchor; every other country is auto-priced from a PPP multiplier table (SEA ~0.9-1.1×, LatAm ~1.2×, EU ~2.5×, US ~3×, JP ~2.2×). One SKU per tier, price rendered in local currency at checkout.
- **Free tier is a real product**, not a trial: 100 SKUs, 25 invoices/mo, 1 seat, basic P&L, no AI, 365 branding on microsite. Everything else is visible but greyed with a clear "Upgrade to unlock" affordance.

## Tier matrix (base = PHP; see PPP note below)

| Capability | Free (₱0) | Starter (₱499) | Pro (₱1,499) | Enterprise (₱4,999) |
|---|---|---|---|---|
| Inventory SKUs | 100 | 1,000 | 10,000 | Unlimited |
| Invoices / month | 25 | 250 | 2,500 | Unlimited |
| Team seats | 1 | 3 | 10 | Unlimited |
| Business locations | 1 | 1 | 3 | Unlimited |
| P&L / GL drilldown | Basic P&L only | Full P&L | Full P&L + GL | + Custom reports, exports |
| Microsite | 365-branded slug | Custom slug | Custom domain | Multi-domain + white-label |
| Marketplace listings | 5 active | 25 active | 100 active | Unlimited |
| Network inventory sharing | — | Read-only | Read + write | Priority routing |
| AI features (translate, doc-check, smart search, DVI) | — | Light bundle | Full bundle | Full + priority |
| Fair-use ceiling (AI calls/mo) | 0 | 500 | 5,000 | 50,000 (soft) |
| Support | Community | Email | Priority email | Dedicated + SLA |
| Accounting (double-entry) | View-only | Full | Full + audit log | + Accountant seat |
| Custom branding on invoices | — | ✓ | ✓ | ✓ + white-label PDFs |

Above-ceiling AI usage is throttled rather than metered — user is prompted to upgrade the tier. This preserves the "all-inclusive" promise.

## PPP regional pricing

- Base prices above are PHP.
- At checkout, price is computed as `base_php × ppp_multiplier[country]`, snapped to a clean local price point (e.g. ends in 9 or 99).
- Admin-editable multipliers per country in a new `shop_manager_regional_pricing` table (country_code, ppp_multiplier, currency, display_format, active).
- Initial multipliers seeded for: PH (1.0), ID/VN/TH (0.9-1.1), MY (1.2), SG (2.0), JP (2.2), KR (1.8), AU (2.6), EU (2.5), UK (2.6), US (3.0), CA (2.8), MX/BR/AR (1.2-1.5), IN (0.7), CN (1.4).
- Currency conversion cached daily from a public FX source.

## What gets built

### 1. Data model (migration)
- `shop_manager_plans` — tier definitions per business kind: `id, business_kind, tier ('free'|'starter'|'pro'|'enterprise'), base_price_php, features (jsonb), limits (jsonb), ai_ceiling, active, sort_order`.
- `shop_manager_regional_pricing` — country_code, ppp_multiplier, currency, active.
- `shop_manager_subscriptions` — user_id, business_id, plan_id, tier, status, current_period_end, cancel_at_period_end, country_code, effective_price_local, effective_currency.
- `shop_manager_ai_usage` — business_id, month_key, calls_used (for fair-use enforcement, not billing).
- Seed rows for all current business kinds × 4 tiers. GRANTs + RLS per rules.

### 2. Entitlement layer
- `src/lib/shop-manager-entitlements.server.ts` — `getShopManagerTier(businessId)`, `checkFeature(businessId, featureKey)`, `checkLimit(businessId, limitKey, currentCount)`, `enforceAiCeiling(businessId)`. Auto-upgrade option preserved.
- Client hook `useShopManagerTier(businessId)` returning `{ tier, features, limits, atLimit(key), pricing }`.

### 3. UI: grey-out pattern
- New `<LockedFeature tier="pro" feature="ai-translate">…</LockedFeature>` wrapper: shows children with `opacity-50 pointer-events-none` overlay + a small "Pro" pill and click-to-upgrade CTA when the user's tier is below the required tier.
- Retrofit inventory form, invoice form, P&L drilldown, microsite settings, DVI, translate button, custom domain, extra seats.

### 4. Pricing page (`/shop-manager/pricing`)
- 4-column comparison table, PPP-aware — auto-detect country from IP/browser, allow override.
- Business-kind selector at top ("I run a…") so caps shown match their reality.
- Toggle: Monthly / Yearly (yearly = 2 months free).
- Prominent "How our AI pricing works" section explaining all-inclusive + fair-use.

### 5. Admin console
- `/admin/shop-manager/plans` — edit tier caps, features, base PHP prices per business kind.
- `/admin/shop-manager/regional-pricing` — edit PPP multipliers, currencies.
- `/admin/shop-manager/subscriptions` — list, filter by tier/country, force-tier for support cases.

### 6. Checkout wiring
- Reuse existing Stripe payments integration (already in project via `src/lib/stripe.server.ts`).
- New server fn `createShopManagerCheckout({ businessId, tier, interval, country })` computes PPP-adjusted price, creates Stripe checkout session in local currency where supported.
- Webhook updates `shop_manager_subscriptions.status` and `current_period_end`.

### 7. Fair-use enforcement
- Middleware wrapping AI server fns increments `shop_manager_ai_usage` and blocks past ceiling with "Upgrade to Pro" response — never a bill.

## Rollout order

1. Migration: plans, regional pricing, subscriptions, ai_usage tables + seeds.
2. Entitlement server helpers + client hook.
3. `<LockedFeature>` component + retrofit ~8 highest-value locks.
4. `/shop-manager/pricing` page with PPP detection.
5. Stripe checkout + webhook wiring.
6. Admin plan/pricing/subscription screens.
7. Fair-use AI middleware.
8. Update `/features` page and Terms/Privacy to reflect tiers and all-inclusive AI billing (Terms sync rule).

## Notes

- Terms & Privacy pages must be updated with the new pricing, fair-use policy, and PPP language, and "Last updated" bumped (per project memory rules).
- Existing `business_plans` / `business_subscriptions` tables are business-directory tiers, not Shop Manager — this plan adds Shop Manager-specific tables so the two products stay separable.
- Free tier stays generous enough to be useful in emerging markets — this is the wedge for global entry.
