## Goal

Replace the single "Price + kind" control with three independent numeric fields plus a Negotiable toggle, so a listing can advertise any combination of:

- **Asking price** (cash, full)
- **Monthly amount** (installment / "all-in monthly")
- **Down payment** (cash-out to start financing)

Sellers can fill in one, two, or all three. Each field has its own minimum so junk values like ₱1 or ₱2 are rejected per field, not just on the headline price.

---

## 1. Schema changes (`listings`)

New columns alongside the existing `price_php`:

- `monthly_php  numeric(14,2)` — nullable
- `down_payment_php numeric(14,2)` — nullable
- keep `negotiable boolean` (already added)
- keep `price_hidden boolean` (already added)
- **Deprecate** `price_kind`: keep the column for now but stop reading/writing it from the app. `price_php` always means the cash asking price going forward; monthly/DP live in their own columns. (Migration leaves old rows intact; a follow-up backfill can move historical `price_kind=monthly/down_payment` rows into the new columns.)

Update the price-floor trigger:

- If `price_php > 0` and category is car/motorcycle/truck/equipment/boat/airplane → must meet category floor (₱20k cars/trucks/equipment, ₱5k motorcycles).
- If `monthly_php` is set → must be ≥ ₱1,000.
- If `down_payment_php` is set → must be ≥ ₱5,000.
- At least one of `price_php`, `monthly_php`, `down_payment_php` must be > 0 when status is not `draft` (prevents "no price at all" listings unless `price_hidden = true`).

---

## 2. Client validation

Shared Zod schema in `src/lib/listing-pricing.ts` used by both `sell.tsx` and `listing.$id.edit.tsx`:

- Each field optional; if present, must be a positive integer above its floor.
- Cross-field rule: at least one field set OR `price_hidden` is true.
- Friendly inline error per field (no generic "please check the form").

---

## 3. Form UI

In the listing form's pricing section:

```
Pricing  (fill any that apply)

[ Asking price (₱) ........... ]   helper: full cash price
[ Monthly payment (₱/mo) ..... ]   helper: e.g. financing monthly
[ Down payment (₱) ........... ]   helper: cash out to start financing

[x] Negotiable
[ ] Hide price — buyers must message me

Registration:  ( Registered | Unregistered | For transfer | Not specified )
```

Inline helper text under the section:
> Real numbers only. Placeholder prices (₱1, ₱2, etc.) are rejected and lower your seller score.

---

## 4. Display

Update `ListingPrice` + `ListingBadges` so a card / detail page can show all three when present:

- **Headline price** = `price_php` when > 0; otherwise the monthly amount; otherwise DP; otherwise "Message for price".
- **Pills** show what's NOT in the headline:
  - "₱X,XXX/mo" pill if monthly set
  - "DP ₱X,XXX" pill if down payment set
  - "Negotiable" pill if toggled
- Detail page shows a small "Financing options" block listing each available amount with its label.

Filters on `/browse` get checkboxes: "Cash price", "Monthly", "Down payment" (default: all three on).

---

## 5. Backend reads

Extend the existing `select(...)` strings in `index.tsx`, `browse.$category.tsx`, `seller.$id.tsx`, `dashboard.favorites.tsx`, `dashboard.likes.tsx`, `listing.$id.tsx`, and the `ListingCardData` interface with the two new columns.

---

## 6. Out of scope

- Auctions / `starting_bid` (still reserved on the deprecated enum).
- Backfill of historical `price_kind` rows — handled later in a one-shot SQL.
- New Stripe/payment logic.
- No `/terms` or `/privacy` edits needed — this changes how price is collected and shown, not fees, payments, data collection, or processors.

---

## Technical notes

- Single migration: add columns, rewrite `listings_price_floor_check()` trigger.
- Shared schema in `src/lib/listing-pricing.ts` (Zod + helper to compute "headline" amount + label).
- `ListingBadges` gains `monthly_php` / `down_payment_php` inputs and renders pills only when values are present and not already the headline.
- `ListingPrice` accepts an optional `headlineKind` so detail pages can force a layout, otherwise it derives from which fields are populated.
- Form: remove the segmented Asking/Monthly/Down-payment selector in `sell.tsx` and `listing.$id.edit.tsx`; replace with the three labeled inputs and keep the Negotiable checkbox and Registration dropdown as-is.
