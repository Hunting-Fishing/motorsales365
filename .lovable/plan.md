## Activate state-based card accents

Right now `ListingCard` shows status badges (NEW, Reported, Price drop, Promo, Featured/boosted, Pending Sale, Renewed) but the card border itself is only colored by seller tier. I'll add a live state-driven accent (ring + subtle glow) around the card so the state is visible at a glance while scanning the grid.

### Priority (highest wins, one accent per card)

1. **Reported** (`openReports > 0`) → amber ring + amber glow
2. **Pending sale** (`status === 'pending_sale'`) → orange ring
3. **Price drop** (`effectiveTrend.direction === 'down'`) → emerald ring + soft green glow
4. **Price up** (`effectiveTrend.direction === 'up'`) → rose ring
5. **Promo active** (`effectivePromo`) → orange ring + glow
6. **Boosted / Featured** → accent ring + amber glow
7. **NEW** (<48h) → emerald ring
8. **Renewed** (<24h bump) → sky ring
9. Fallback → existing `tier.ringClass` / `tier.glowClass`

### Changes (frontend only)

- `src/components/listing-card.tsx`
  - Add a small `pickCardAccent(...)` helper (in-file) returning `{ ring, glow }` tailwind classes using the priority above, reading the same signals already computed (`openReports`, `boosted`, `effectiveTrend`, `effectivePromo`, `listing.status`, `listing.published_at`, `listing.updated_at`).
  - Replace `tier.ringClass, tier.glowClass` in the outer `cn(...)` with the accent result, falling back to tier classes when no state applies.
  - Keep all existing badges as-is (accent complements them, doesn't replace them).

No backend, hook, or data changes — all signals are already fetched (`useListingReportSummary`, `useListingPriceTrend`, `useListingPromo`, plus the listing fields). No new dependencies.

### Verification

- Load `/browse/car` — cards with existing NEW/Pending Sale/Reported badges should now also have a matching colored ring.
- Confirm only one accent renders per card (priority order).
- Confirm tier ring still shows on cards with no active state.
