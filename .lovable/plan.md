# Used Parts marketplace — plan

## What we're building (one sentence)
A buyer-facing **Used Parts** marketplace: sellers (Banawe yards, parters-out, individuals) list used vehicle parts and "vehicles for parts"; buyers find them via a guided wizard (vehicle → system → specific part) or browse a parts grid; quote-style messaging to the seller, no inventory/checkout yet.

## On a Car-Part.com equivalent
There is no Philippines-wide salvage-yard data network we can plug into or download. Real options:
- **Build it ourselves** as a listings marketplace (what this plan does).
- Optional later: paid catalog (Partly / Tecdoc) for fitment accuracy.
- Optional later: scrape Carousell / FB Marketplace to seed inventory using our existing scraper infra.

## Scope

### 1. New listing category — `used_part`
- Add `used_part` to the listings category enum (alongside `car`, `motorcycle`, etc.). New listings of this category have part-specific attributes instead of vehicle attributes.
- Add `vehicle_for_parts` as a flag on existing car/motorcycle/truck listings — a checkbox "Selling for parts only" so a complete donor car shows up in parts searches too.

### 2. Home chip — "Parts" added to Shop by Category
- Insert a **Parts** chip (icon: Wrench) in `VEHICLE_CATEGORIES` between "Other" and the service strip, matching the reference image. Routes to `/parts`.
- Keep the existing **Parts & Accessories** service chip for the (future) new-parts/affiliate side; rename it to **New Parts (Shops)** to disambiguate from used.

### 3. New `/parts` hub route
Two tabs:
- **Find a part (wizard)** — guided 3-step flow:
  1. **Vehicle**: year / make / model (reuse `vehicle-picker.tsx` + `data/vehicles.ts`).
  2. **System**: chips from `NEEDED_PARTS_GROUPS` (Brakes, Tires & wheels, Suspension, Engine, Electrical, Body, Interior, Drivetrain, Fluids). Multi-select allowed across systems.
  3. **Specific part(s)**: chips from the selected systems' items (multi-select). Free-text "other / describe" field + optional photo upload.
  4. Submit → either (a) shows matching `used_part` listings, or (b) creates a `wanted_post` (we already have `wanted_posts` table) that suppliers can respond to.
- **Browse parts** — grid of `used_part` listings filtered by system, vehicle fitment, region. Reuses `listing-card`.
- Sidebar: link to **Auto Salvage** business directory + **Vehicles for parts** (filtered car listings with `vehicle_for_parts=true`).

### 4. Seller flow — "Sell a part"
- New `/sell?category=used_part` path through existing `sell.tsx`.
- Part-specific fields: part name (autocomplete from `NEEDED_PARTS_GROUPS`), system, OEM/aftermarket, condition (new-takeoff / used-good / used-fair / for-rebuild / core), compatible vehicles (multi: year-range + make + model[+ trim]), part number (optional), warranty (none / 7-day / 30-day), photos (existing uploader).
- Allowed listers: any authenticated user (used parts is peer-to-peer plus business sellers — businesses like Auto Salvage already exist).

### 5. Fitment / search
- New table `listing_fitment` (listing_id, make, model, year_min, year_max) so one part listing can match many vehicles. Indexed for lookups.
- Wizard queries: `listings WHERE category_slug='used_part' AND id IN (SELECT listing_id FROM listing_fitment WHERE make=? AND model=? AND year BETWEEN year_min AND year_max) AND attributes->>'part_system' = ANY(?)`.
- "Vehicles for parts": `listings WHERE category_slug IN ('car','motorcycle','truck') AND attributes->>'for_parts' = 'true'`.

### 6. Taxonomy expansion
Extend `NEEDED_PARTS_GROUPS` in `src/data/needed-parts-catalog.ts` to cover used-parts demand (current list is service-oriented):
- **Drivetrain**: engine assembly, transmission (auto/manual), transfer case, differential, axles, driveshaft, clutch.
- **Body**: doors, hoods, bumpers, fenders, tailgates, mirrors, glass, panels.
- **Interior**: seats, dashboards, headliners, door panels, carpets, steering wheels.
- **Exterior trim/lighting**: headlights, taillights, grilles, badges.
- **Wheels**: rims, hubs, hubcaps.
- Keep existing service items but mark them service-only so wizard hides them from the used-parts picker.

### 7. Backend (Lovable Cloud)
One migration:
- `ALTER TYPE category` add `used_part` (or extend `categories` table — confirm during build).
- `CREATE TABLE listing_fitment (id, listing_id FK, make, model, year_min, year_max, trim NULLABLE, created_at)` with GRANTs + RLS (public read, owner write via listing).
- Index on `(make, model, year_min, year_max)`.
- No new business logic in edge functions; everything goes through existing server fns (extend `browse-listings.functions.ts` with a `searchPartsFitment` server fn).

### 8. Routing changes
- Add `src/routes/parts.tsx` (hub with tabs).
- Add `src/routes/parts.wizard.tsx` (optional split if hub gets long — decide during build).
- `src/routes/sell.tsx` learns about `used_part` category and renders part-specific fields.
- `src/routes/browse.$category.tsx` works for `/browse/used_part` out of the box once the category exists.
- Home chip wired in `src/routes/index.tsx`.

### 9. Out of scope (deferred)
- Live checkout / Stripe for parts (stays quote/message-only).
- Paid Tecdoc / Partly catalog integration.
- Auto-scraping Carousell / FB Marketplace.
- Cross-yard inventory federation (no PH network exists).
- The existing "Coming Soon" affiliate-parts placeholder on listing pages — untouched.

## Policy sync (per memory)
- `/terms`: add "Used Parts marketplace" addendum — peer-to-peer sales, no warranty by platform, seller condition disclosure required. Bump "Last updated".
- No `/privacy` changes (no new data categories).

## Files touched (estimate)
- New: `src/routes/parts.tsx`, `src/components/parts/parts-wizard.tsx`, `src/components/parts/fitment-editor.tsx`, one migration.
- Edited: `src/routes/index.tsx` (chip), `src/data/needed-parts-catalog.ts` (taxonomy), `src/routes/sell.tsx` (used_part fields), `src/lib/browse-listings.functions.ts` (fitment search server fn), `src/routes/terms.tsx` (addendum).

## Open question I'll surface once during build
Whether "vehicles for parts" should be a separate listing category or a flag on existing vehicle categories. Plan currently uses a flag — simpler, keeps SEO of the vehicle category intact.
