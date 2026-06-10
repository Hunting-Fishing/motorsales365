## Goal

Show a compact row of trust badges on every listing card (and the listing detail header) so buyers can scan a seller's credibility at a glance.

## The 8 badges and their data source

| Badge | Source | Notes |
|---|---|---|
| Phone Verified | `profiles.phone_verified_at IS NOT NULL` | already captured |
| ID Checked | `profiles.verification_status = 'verified'` | already shown as "VerifiedBadge"; re-label inside the trust strip |
| OR/CR Submitted | `listings.attributes.or_cr_status IN ('complete','partial')` | seller-declared, field exists |
| Documents Checked | `vehicle_passport_verifications.status = 'approved'` for the linked vehicle | admin-reviewed signal |
| Registered Owner | `listings.attributes.registered_owner = 'yes'` | NEW attribute (yes / no / unknown) |
| Deed Chain Available | `listings.attributes.deed_chain_available = true` | NEW boolean attribute |
| Inspection Available | `listings.attributes.inspection_available = true` | already exists in editor |
| 365 Passport | Vehicle linked to listing has a published passport page | derived from passport status + public flag |

No badge renders when its condition is false — empty trust strip is fine and means "no claims yet".

## Work breakdown

1. **Schema-light additions (no migration)**
   - Add `registered_owner` (yes/no/unknown) and `deed_chain_available` (boolean) to `src/lib/category-attributes.ts`.
   - Wire both into `src/components/listings/category-attributes-editor.tsx` for `car`, `motorcycle`, `truck`, `equipment`, `boat` blocks (skip airplane — handled by stricter workflow).
   - Add matching filter controls in `src/components/browse/category-filters.tsx` and search-schema entries + query clauses in `src/routes/browse.$category.tsx`.

2. **TrustBadges component** — `src/components/listings/trust-badges.tsx`
   - Accepts a typed `TrustSignals` object with the 8 booleans.
   - Renders small pill badges with icons (Phone, IdCard, FileText, ShieldCheck, UserCheck, ScrollText, Eye, BadgeCheck) and Radix Tooltip explaining each.
   - Two sizes: `sm` (card, max 4 visible + "+N" overflow) and `md` (detail header, all visible).
   - Uses semantic tokens only; verified/admin-checked badges use `primary`, seller-declared use `secondary`.

3. **ListingCard wiring** — `src/components/listing-card.tsx`
   - Extend `ListingCardData` with `seller_phone_verified`, `passport_status`, `passport_published`.
   - Remove the standalone `VerifiedBadge` from the top-image row and instead render `<TrustBadges signals={…} size="sm" />` below the title (above price), so the strip lives in the card body and doesn't fight the existing image-overlay badges.

4. **Query updates**
   - Update the listing select shapes in `src/routes/browse.$category.tsx`, `src/routes/index.tsx`, `src/routes/seller.$id.tsx`, `src/routes/dashboard.favorites.tsx`, and `src/routes/dashboard.likes.tsx` to pull `profiles.phone_verified_at` and join the latest `vehicle_passport_verifications` row through the listing→vehicle link.
   - Add a small helper `deriveTrustSignals(listingRow)` in `src/lib/trust-signals.ts` so every caller maps once.

5. **Listing detail page** — `src/routes/listing.$id.tsx`
   - Render `<TrustBadges size="md" />` in the seller info block. Each badge tooltip links to a brief explanation; the "365 Passport" badge links to the vehicle's public passport page when available.

6. **Docs / policy sync**
   - Update `/terms` "Listings & data handling" section and bump "Last updated" to note that seller-declared trust flags (registered owner, deed chain, inspection available, OR/CR status) are seller representations, while ID Checked / Documents Checked / Passport are 365-verified.

## Technical details

- No new DB columns; `registered_owner` and `deed_chain_available` ride on the existing `listings.attributes` JSONB column.
- Trust signal derivation is pure and unit-testable; no server fn needed.
- Tooltip uses existing `@/components/ui/tooltip`. On touch devices Radix Tooltip falls back to long-press; that's acceptable.
- Card height stays predictable: the strip is a single `flex-wrap` row with `gap-1`, max two visual lines.
- Browse filter additions use the same JSONB pattern already in place (`attributes->>key` equality / boolean comparison).

## Out of scope

- No changes to verification submission workflow, KYC, or passport publishing pipeline — those already exist; this plan only surfaces their outcomes on cards.
- Airplane listings remain on the higher-trust manual-review workflow and don't get the seller-declared "Registered Owner / Deed Chain" inputs.
