
## Goal

Reposition 365MotorSales from a "directory listing" for tow companies into the **underdog dispatch software for every tow + trucking operator in the Philippines**. Drop the entry price to roughly **$1/mo (₱49)** and cap the top tier at roughly **$18/mo (₱999)** so a single completed job pays for a full year of software. Big roadside brands (AAP, Motolite Res-Q, Shell Go+, MPT DriveHub) keep their consumer subscriptions — we sit underneath them as the dispatch tool their subcontractors actually run on.

## New Pricing (towing + trucking)

| Tier | Monthly (PHP) | Yearly (PHP, 2 mo free) | Positioning |
|---|---|---|---|
| **Starter** (listed) | ₱49 (~$0.90) | ₱490 | Free directory listing + basic dispatch inbox. The "no excuse not to sign up" tier. |
| **Pro** (featured) | ₱299 (~$5) | ₱2,990 | Priority placement, SMS/push job alerts, accept/decline, up to 5 drivers, lead routing. |
| **Fleet** (premium) | ₱999 (~$18) | ₱9,990 | Unlimited drivers, live GPS, multi-branch, region tag, white-label customer link, API. |

Trucking mirrors the same three tiers at the same prices.

Old tiers (₱299 / ₱699 / ₱1,499 for towing; ₱399 / ₱899 / ₱1,799 for trucking) are retired but kept inactive for historical subscriptions.

## Repositioning (copy + page structure)

- `/tow` and a new `/dispatch` landing reframe the pitch:
  - Headline: **"Dispatch software for Philippine tow & trucking operators — from ₱49/month."**
  - Subhead: "AAP, Motolite, Shell Go+ talk to drivers. We power the operators behind them."
  - 3 value props: **Get jobs**, **Run the dispatch**, **Look professional**.
  - Comparison block: 365MotorSales vs AAP membership vs in-house radios.
- `/pricing` shows the new 3-tier card grid + a "1 completed job pays for the year" calculator.
- Add a "Switch from radios / GC / spreadsheet" CTA section.

## Technical Changes

1. **Migration** `update_towing_trucking_pricing.sql`:
   - `UPDATE business_plans` for the 12 existing towing + trucking rows: new `price_php`, `description`, and friendlier `tier` labels in `description` (Starter / Pro / Fleet) — keep enum `tier` values (`listed`/`featured`/`premium`) so existing FK + RLS keep working.
   - Keep `stripe_lookup_key` slugs intact so Stripe prices auto-resync via lookup_key.
2. **Stripe prices** — call `payments--create_price` for each of the 12 lookup keys at the new amounts (USD-cents equivalents). Old prices stay attached to legacy subscribers; new checkouts use the new amount via `lookup_key` rebind.
3. **`src/routes/tow.tsx`** — rewrite hero, value props, comparison table, and pricing section to match repositioning.
4. **`src/routes/pricing.tsx`** — surface the new towing/trucking tiers prominently with the "1 job = 1 year" framing.
5. **`src/routes/dashboard.tow.tsx`** — add a "Starter is free-ish (₱49)" upsell banner for unsubscribed operators; nothing else changes.
6. **No code change to checkout, webhooks, or `business_subscriptions`** — they already key off `business_plans.id` / `stripe_lookup_key`.
7. **Memory** — add a `mem://policies/pricing-towing-trucking` rule so future repricing edits stay consistent with /terms + /pricing.
8. **Terms + Privacy sync** — bump "Last updated" on `/terms` (fee/pricing change) and leave `/privacy` untouched (no data-handling change).

## What we are NOT doing in this pass

- No per-job lead fees (separate future build — flagged in earlier plan).
- No white-label embed widget yet.
- No driver-side mobile app — current PWA dashboard is enough at ₱49.
- Not touching rental / financing / carwash / repair / parts plans.

## Out-of-scope follow-ups (note only)

- Add `per_job_fee` column + optional ₱150/accepted-job billing for Starter tier.
- "Powered by 365MotorSales" embed for insurers / dealerships.
- SMS gateway cost pass-through once volume grows.
