
## Goal

Turn the Rides hub, the Clubs directory, and the Clubs tab on `/rides` into pages that actually explain what Rides and Clubs are on 365 MotorSales, and clearly document the **5% Club Member Discount** — eligibility, scope, and how it applies at checkout.

Right now these pages only show a one-line subtitle and a grid, so new visitors don't understand what a "Ride" is, what makes a Club "accredited", or why they'd bother applying.

## What gets added

### 1. `/rides` — Rides hub (`src/routes/rides.index.tsx`)

Under the existing hero, before the Rides/Clubs tabs, add a compact **"About Rides"** explainer strip (3 short cards):

- **What is a Ride?** — A public profile page for a specific vehicle (car, bike, truck, boat, project build) owned by a community member. Photos, specs, mods, and full service history in one place.
- **Why post yours?** — Show off the build, keep a permanent service log, get likes/comments, and (optionally) mark it "for sale" to flip it straight into a marketplace listing.
- **How it works** — Add your ride → upload photos → log mods and service → share the link. Free for all members.

Inside the **Rides tab content**, above the grid, keep a short line linking to "Add your ride" (already there — no duplication).

Inside the **Clubs tab content** (currently just a subtitle + button), add the same "About Clubs" summary used on `/clubs` (see §2) so users landing on the tab get the full picture without navigating away.

### 2. `/clubs` — Clubs directory (`src/routes/clubs.index.tsx`)

Replace the current 2 pill-badges with a proper **"About Clubs on 365"** section between the hero and the search bar. Three cards:

- **Accredited only** — Every club is reviewed with formal documentation (LTO accreditation, SEC / DTI registration, or equivalent) before it's published. No fly-by-night groups.
- **Community + safety** — Find riding groups, car clubs, off-road crews and brand-owner communities near you. See member counts, region, and upcoming events.
- **Verified member perks** — Members of a verified club unlock a **5% Club Member Discount** on internal 365 purchases (see §3).

Also add a compact **"Start a club"** CTA card explaining the application flow in 3 steps: Submit accreditation docs → Admin review → Publish and invite members.

### 3. New **Club Member Discount** explainer

A new shared component `src/components/clubs/club-discount-explainer.tsx` rendered on both `/clubs` (below the About cards) and inside the Clubs tab on `/rides`. Content — sourced from the existing project rule so it stays accurate:

- **What you get:** 5% off internal 365 MotorSales purchases.
- **What it applies to:** ads, listing boosts, listing bundles, subscription plans, and Passport Premium.
- **What it doesn't apply to:** third-party items (insurance quotes, partner parts, tow provider fees, external shops) — those aren't 365-controlled.
- **Who's eligible:** signed-in members of a **verified** club whose membership is active. Membership status is re-checked at checkout; if you leave the club or the club loses verified status, the discount stops applying to future purchases.
- **How it applies:** automatically at checkout on eligible purchases — no coupon code needed. You'll see a "Club member 5% off applied" note and the eligibility reason is recorded on the receipt.
- **Stacking:** does not stack with other percentage discounts or promo coupons on the same purchase — the larger discount wins.
- **Future perks:** insurance rates, parts discounts, and event access are on the roadmap but not live yet — the 5% off is the only live perk today.

### 4. `/rides/$slug` and `/clubs/$slug`

Out of scope for this pass. This plan only touches the two hub pages and the Clubs tab.

## Technical notes

- All new content is **presentation-only** — no schema changes, no server functions, no new queries. Reuses the existing hero + grid layout.
- New file: `src/components/clubs/club-discount-explainer.tsx` (pure presentational, no props required beyond an optional `className`).
- Edits: `src/routes/rides.index.tsx` (add "About Rides" strip; expand Clubs tab with "About Clubs" summary + `<ClubDiscountExplainer />`), `src/routes/clubs.index.tsx` (replace pill badges with "About Clubs" cards + `<ClubDiscountExplainer />` + "Start a club" CTA).
- Meta descriptions on both routes stay as-is; content is what changes.
- No terms/privacy changes needed — the discount rules described here already match the live policy captured in project memory. If the % or scope ever changes, this copy plus `/terms` must both be updated.
