## Plan: Clear On-Card Pricing Widgets

### Goal
Make it immediately obvious on every listing card which price fields are set (Asking, Monthly, Down payment) and whether the price is negotiable, using a grouped row of prominent pill badges.

### What We’ll Build

1. **New `PricingWidget` component** (`src/components/listings/pricing-widget.tsx`)
   - Shows a dedicated, grouped row of pill badges for every price field that has a value.
   - Always shows a pill for each set field, **including** the headline price (unlike today where the headline is suppressed). This makes it crystal-clear which fields are populated.
   - Highlights the headline price pill with a stronger background/border so it stands out as the primary number.
   - Shows a "Negotiable" pill when `negotiable = true`.
   - Uses distinct colors:
     - Asking = green/emerald
     - Monthly = purple
     - Down payment = orange
     - Negotiable = blue
   - Renders directly under the headline `ListingPrice` on cards, before `TrustBadges`.

2. **Update `ListingCard`** (`src/components/listing-card.tsx`)
   - Replace the current `ListingBadges` pricing pills with the new `PricingWidget`.
   - Keep `ListingBadges` for tier, registration, and penalty badges (those remain useful but are separate from pricing).

3. **Update `ListingBadges`** (`src/components/listings/listing-badges.tsx`)
   - Remove the pricing pills (monthly, DP, cash, negotiable) from this component so cards don’t duplicate them.
   - Keep tier, registration status, and penalty badges.

4. **Update listing detail page** (`src/routes/listing.$id.tsx`)
   - Add `PricingWidget` under the headline price so the same clarity exists on the detail page.

### Visual Result
- Card shows headline price in large text.
- Right below it: a tight row of colored pills like `Cash ₱450K` · `Monthly ₱12K/mo` · `DP ₱80K` · `Negotiable`.
- Buyer can instantly see all financing options the seller provided.

### Out of Scope
- No database or schema changes.
- No changes to sell/edit forms.
- No changes to filters or search.
