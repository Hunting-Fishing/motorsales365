# Rebuild the QR scan landing page into a sales pitch

The QR scan destination (`src/routes/r.$code.tsx`) currently reads like internal placeholder copy ("Shared 365 feature page", "Feature the roadmap clearly", "Coming soon"). When a real person scans a printed/worn QR, this page needs to **sell the platform in the first screen** and convert them into a signup, a listing, or a business partner.

## Goals

1. Replace placeholder/meta copy with a benefit-led pitch aimed at three audiences: **buyers, sellers, and businesses**.
2. Add a clear **"Why 365 beats Facebook & Google"** section with side-by-side comparison.
3. Add a **boost & ads pricing callout** showing how much cheaper 365 is than FB Boost / Google Ads.
4. Keep all referral-tracking logic intact (scan recording, visit counter, contact line, active promos).
5. Reuse existing design tokens — no new color hardcoding.

## What changes

**File:** `src/routes/r.$code.tsx` (single-file rewrite of the marketing sections; data-loading useEffect untouched).

### New section order (after the existing referral-credit card)

1. **Hero** — strong headline + subhead + two CTAs (Create account / Browse listings). Keep the small "{referrer} brought you to 365 Motor Sales" credit chip above it. Drop the "Shared 365 feature page" eyebrow.
2. **Why 365 vs Facebook vs Google** — 3-column comparison card. Rows: Built for vehicles, Real seller verification, Direct buyer messaging, Local services map, Boost cost, No algorithm guessing. ✓/✗ + short cell text. On mobile collapses to stacked cards per competitor.
3. **Boost & advertising pricing** — three pricing tiles using real numbers from `pricing.tsx`:
   - Search Boost ₱99 / 7 days
   - Province Boost ₱199 / 7 days
   - Compare to: "Facebook Boost typically ₱500–₱2,000 for similar reach" / "Google Ads ₱20–₱60 per click"
   Include a footnote that FB/Google figures are typical PH market ranges, not quotes.
4. **For buyers / For sellers / For businesses** — 3 short benefit cards replacing the current generic image panels. Reuse 3 of the existing referral images (find-vehicles, post-connect-sell, services-near-you) so we keep visual richness without new assets.
5. **Trust strip** — chips (existing FEATURE_CHIPS) + a one-line trust statement ("Verified sellers · PH-based support · No bidding wars").
6. **Final CTA band** — Sign up free / List your business. Keep current styling.

### Removed

- "Shared 365 feature page" eyebrow and all copy framing the page as an internal tool.
- The 5 `SECONDARY_PANELS` referring to "Featured page", "Coming soon", "Future roadmap", "What's next" — those read as internal product-roadmap notes, not buyer-facing.
- Orphaned imports for the dropped image assets (`everythingInOnePlaceAsset`, `manyOpportunitiesAsset`, `comingSoonAsset`, `whatsNextAsset`).

### Kept untouched

- All `useEffect` data loading (scan recording, promos, contact, visit counter).
- Referral credit card, repeat-scan tooltip, active-promo grid.
- Route head/meta (still `noindex, nofollow`).

## Technical notes

- Pure presentational changes in one route file; no new routes, no new packages, no schema changes.
- Comparison table uses `lucide-react` `Check` / `X` icons (already a dependency).
- Boost numbers are imported as plain constants matching `pricing.tsx` so they stay easy to keep in sync; FB/Google ranges are static copy with a footnote.
- Mobile: comparison grid uses `md:grid-cols-3` with stacked cards below `md`.

## Out of scope

- No edits to `/pricing`, no new admin controls, no DB changes.
- No new images generated — reusing existing referral assets.
