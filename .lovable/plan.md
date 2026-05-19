## Goal

On `/pricing`, when the user already has a subscription on file:
1. Make every other plan card actually selectable (currently all non‑current cards are disabled with "Subscription on file").
2. Show, on each card, a clear delta vs the current plan (listings, photos, monthly price, and prorated credit if upgrading) so the user can compare before switching.

## Changes to `src/routes/pricing.tsx`

### 1. Replace the blanket "hasOther" disable with intent‑aware actions

Today: `hasOther = mySub && !isCurrent && status in (pending|active|paused)` disables every non‑current card.

New per‑card logic, computed against the user's current plan:
- `isCurrent` → button shows `Current (active)`, disabled.
- `mySub.status === "pending"` on a different plan → only that pending card shows `Pending review`, all others stay actionable.
- `priceDelta > 0` (upgrade) → button label `Upgrade — pay {net} now`, where `net = max(0, plan.price − proratedCredit)`.
- `priceDelta < 0` (downgrade) → button label `Switch to {plan.name}` with helper text "Takes effect next renewal".
- Same price, different plan → `Switch to {plan.name}`.
- No current sub → keep `Request this plan` / `Sign up to subscribe`.

### 2. Compute prorated credit inline (same formula as billing)

Add a `proratedCredit` value derived from `mySub.current_period_start`, `mySub.current_period_end`, `currentPlan.price_php`, and `now`:

```text
credit = round(currentPlan.price * remainingMs / totalMs)
```

Use it to display the upgrade net‑due on each card and to label the CTA.

### 3. Comparison strip on each non‑current card

Below the price, when `currentPlan` exists and the card is not current, render a compact "vs your plan" row showing the three deltas that matter:

```text
Listings:  20 / mo   (+15)
Photos:    12 / listing (+7)
Price:     ₱280 / mo  (+₱200)
Credit:    −₱45 prorated from Bronze   ← only on upgrades
You pay:   ₱235 now                    ← only on upgrades
```

Use semantic color tokens (`text-emerald-600` for positive deltas / credits, `text-muted-foreground` for neutral, `text-amber-600` for reductions on downgrades). Hide the row entirely when there is no current plan.

### 4. Switch action

`requestPlan` becomes `selectPlan(planId)`:
- If no current sub → existing insert + referral path (unchanged).
- If switching → route to `/dashboard/billing` with `?upgrade={planId}` in the URL. The billing page already owns the confirmation dialog (prorated charge, credit days, "what changes immediately"). On mount, `dashboard.billing.tsx` reads that query param and auto‑opens the existing `confirmOpen` dialog for that plan. Keeping the actual switch on /billing avoids duplicating the confirm + payment flow and reuses the line‑item proration we just built.

### 5. Small UI polish

- Add `aria-current="true"` on the current plan card.
- Keep ring/border highlight on current.
- Move the "View billing →" link to also appear inline on each non‑current card's footer as a secondary link, so users can always jump to billing.

## Out of scope

- No schema changes — `subscription_plans`, `subscriptions`, and `payments` already carry every field needed.
- No changes to the billing page's existing confirm dialog logic, just the query‑param trigger.
- Per‑line‑item proration (already shipped on the receipt) is unchanged.

## Files touched

- `src/routes/pricing.tsx` — main rewrite of the subscription card section.
- `src/routes/dashboard.billing.tsx` — add a small `useEffect` that reads `?upgrade=` from the URL and opens the existing confirm dialog with that plan preselected.
