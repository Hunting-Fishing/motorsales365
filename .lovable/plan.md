# Add Car Wash, Parts, and Drones categories

Add three new listing categories so users can list and browse: car-wash locations, parts shops/sellers, and drone companies. Each follows the existing service/product listing pattern (location + photos + contact + category-specific attributes), mirroring how Towing works today.

## What gets added

**1. Three new categories in the database**
Insert into `public.categories`:
- `carwash` — "Car Wash" (icon: droplets, sort 7)
- `parts` — "Parts & Accessories" (icon: wrench, sort 8)
- `drone` — "Drones & Aerial" (icon: plane / drone, sort 9)

`other` keeps sort 10. RLS already allows public read and admin manage — no policy changes needed. (Schema-only change → migration.)

**2. Sell form (`src/routes/sell.tsx`)**
- Add the three slugs to the `CATEGORIES` array.
- Add a category-specific Details section for each (rendered like the existing `towing` branch). Stored on `listings.attributes` (jsonb), no new columns:
  - **Car Wash**: services offered (multi-select: Basic wash, Detailing, Interior, Engine wash, Ceramic coating, Motorcycle wash), pricing tier (Budget / Mid / Premium), starting price ₱, accepts walk-ins (bool), open 24/7 (bool), operating hours free-text.
  - **Parts**: part type (Engine, Body, Suspension, Electrical, Tires & Wheels, Accessories, Other), brand, condition (already in form), fits make/model/year (free text), OEM/aftermarket toggle, in-stock quantity.
  - **Drones**: business type (Sales / Aerial photography service / Repair / Training), drone brands carried (free text), services offered (Photo, Video, Mapping, Inspection, Agriculture), licensed operator (bool), coverage regions (comma-separated, like towing).
- For Car Wash and Drones, the listing is location-anchored (the existing LocationPicker covers this — no change). Parts uses the same location for shop/pickup point.
- Skip the vehicle make/model picker for these three; keep title/price/photos/location.

**3. Browse page (`src/routes/browse.$category.tsx`)**
- Extend `CATEGORY_LABEL` with: `carwash: "Car Wash"`, `parts: "Parts & Accessories"`, `drone: "Drones & Aerial"`.
- No filter logic changes needed — the existing region/province/city/keyword/price filters apply.

**4. Home page (`src/routes/index.tsx`)**
- Add the three slugs to the `CATEGORIES` const with Lucide icons: `Droplets` (car wash), `Wrench` (parts), `Send` or `Plane` repurposed (drones — we'll use `Send` since `Plane` is taken by airplanes).
- They appear in the hero category select and the chip row automatically.

**5. Listing detail page**
The existing `listing.$id.tsx` renders attributes generically — confirmed during exploration that towing-specific attributes already display via the attributes block, so the new category attributes show up without changes. Only verify the headline/breadcrumb labels read correctly (driven by `CATEGORY_LABEL`, which we're updating).

## Files touched

- `supabase` migration: insert 3 rows into `categories`.
- `src/routes/sell.tsx`: extend CATEGORIES, add 3 new conditional Details sections, extend submit handler to persist their attributes.
- `src/routes/browse.$category.tsx`: extend `CATEGORY_LABEL`.
- `src/routes/index.tsx`: extend `CATEGORIES` with icons.

## Out of scope (call out for later if wanted)

- No dedicated booking/quote flow for car wash or drones (towing has bids; these would just use the messaging system for now).
- No parts-specific catalog/SKU search — uses regular keyword search.
- No category-specific filter chips in browse (e.g. filter parts by part type). Can be added later.

Ready to implement on approval.
