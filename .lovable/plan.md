## Goal
Turn the towing surface from a generic "for sale" listing into a services marketplace:
- Rename label everywhere: **Towing & Trucking → Towing & Transport Services**
- `/browse/towing` becomes a tailored services page (filters, providers, emergency form, CTA)
- Keep existing `/tow` request form (reused as the emergency request component)

## 1. Rename across the app
Files: `src/routes/index.tsx`, `src/routes/browse.$category.tsx` (CATEGORY_LABEL), `src/routes/sell.tsx`, `src/routes/listing.$id.edit.tsx`, `src/components/site-footer.tsx`, `src/routes/tow.tsx` (head/desc), `src/data/business-kinds.ts` if relevant.

Browse SEO title for towing should override to:
`"Towing & Transport Services in the Philippines — 365 MotorSales"`
(not the generic `{label} for sale` template).

## 2. Dedicated towing services page
Add a branch inside `src/routes/browse.$category.tsx` so that when `category === "towing"` we render a new `TowingServicesPage` component instead of the generic listing grid (extracted into `src/components/towing/towing-services-page.tsx`).

### Sections (top → bottom)
1. **Hero** — title "Towing & Transport Services", subtitle, two CTAs:
   - "Request emergency tow" (scrolls to form / opens dialog)
   - "List your towing company" → `/sell?category=towing`
2. **Featured towing providers** — reuse `<FeaturedTowProviders />` (already exists).
3. **Service filters bar** (URL-synced via search params; extend `searchSchema` with optional `service`, `capacity`, `region`, `payment`, `verified`, `open247`):
   - Service type chips: Tow car, Tow motorcycle, Flatbed, Long-distance transport, Heavy equipment hauling, Recovery/winch-out
   - Province coverage (LocationPicker region/province)
   - 24/7 available toggle
   - Accepts GCash / Maya / Cash select
   - Verified provider only toggle
   Filtering uses `listings.attributes->>service_type`, `vehicle_capacity`, `coverage_regions` (array contains), `available_24_7`, `profiles.verification_status='verified'`. Payment filter reads `attributes->payments` (new optional field — gracefully ignored when missing; no schema change required).
4. **Provider grid** — `ListingCard` results for `category_slug='towing'` with filters applied.
5. **Emergency tow request form** — inline embed of the existing `/tow` form fields (extracted into `src/components/tow/tow-request-form.tsx`) with: pickup/dropoff (LocationPicker + street), vehicle type (select: Car / Motorcycle / SUV / Truck / Heavy equipment), contact number, preferred payment (GCash / Maya / Cash / Bank), notes. Submits to existing `tow_requests` table (extra fields stored in `notes` if column not present).
6. **"List your towing company" CTA strip** at the bottom → `/sell?category=towing`.

### Sell form additions (`src/routes/sell.tsx`, `listing.$id.edit.tsx`)
Extend `TOW_SERVICE_TYPES` to include: Tow car, Tow motorcycle, Long-distance transport, Heavy equipment hauling, Recovery/winch-out (keep Flatbed, Wheel-lift, etc.). Add optional **Accepted payments** multi-checkbox (GCash, Maya, Cash, Bank) → `attributes.payments`. Already captures 24/7 and coverage regions.

## 3. Components to create
- `src/components/towing/towing-services-page.tsx`
- `src/components/towing/service-filters.tsx`
- `src/components/tow/tow-request-form.tsx` (extracted from `/tow`)

## 4. Out of scope
- Database schema changes (all new fields piggyback on `listings.attributes` JSON and `tow_requests.notes`)
- Payment provider integrations
- New analytics events

## Technical notes
- No migration needed.
- Browse route gains a category-specific branch; existing categories unaffected.
- `/tow` route stays and now imports the extracted form component, so behavior is unchanged for direct visitors.
- Maintain SEO: unique head() for towing inside browse route (title/desc/canonical/og).
