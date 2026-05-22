
## Goal

Let shoppers pick **Make → Model → Year** (and optionally Category) to filter shop products to only items that fit their vehicle — the same flow eBay Motors / RockAuto / AutoZone use. The selected vehicle is also remembered so we can target ads and product recommendations to that ride.

## User experience

1. **Shop hero gets a "My Garage" fitment selector**
   - Three dropdowns: Make, Model, Year (Year list driven by `CAR_MODEL_YEARS` so we only show valid years for that model).
   - Optional 4th: Category chip (Detailing / Tools / Parts / Accessories).
   - "Find parts that fit" button → navigates to `/shop?make=Toyota&model=Vios&year=2018`.
   - "Universal fit only" checkbox to show products that fit any vehicle.

2. **Persistent garage**
   - Selected vehicle is saved to `localStorage` ("My Garage") and shown as a pill in the shop header: *"Showing parts for: 2018 Toyota Vios ✕"*.
   - Logged-in users with a ride in `/dashboard/rides` get a one-click "Use my ride" button that prefills the selector from their listing.

3. **Filtered listings everywhere in the shop**
   - `/shop`, `/shop/$category`, and search results all respect the active vehicle filter via URL search params.
   - Each product card gets a small green "Fits your 2018 Vios" badge when matched, or a neutral "Universal" badge.

4. **Targeted ads**
   - `AdCarousel` reads the active vehicle from the garage and passes `make`/`model` to ad lookup, so the ads server can prefer creatives tagged with that vehicle (falls back to untargeted ads).

5. **Product detail page**
   - "Fitment" section lists which makes/models/year-ranges this product fits, plus an inline fitment checker ("Does this fit my car?").

## Data model changes (Supabase)

Add three tables + one fitment join:

```text
vehicle_makes      (id, name unique, category 'car'|'motorcycle', sort_order)
vehicle_models     (id, make_id fk, name, year_start, year_end nullable)
shop_product_fitment (
  id, product_id fk shop_products,
  make_id fk nullable,            -- null = fits any make
  model_id fk nullable,           -- null = fits any model in that make
  year_start int nullable,
  year_end   int nullable,
  notes text nullable,
  unique(product_id, make_id, model_id, year_start, year_end)
)
shop_products.universal_fit boolean default false
```

- Seed `vehicle_makes`/`vehicle_models` from the existing `src/data/vehicles.ts` (`CAR_MAKES`, `MOTORCYCLE_MAKES`, `CAR_MODEL_YEARS`) via a one-shot migration insert — no manual data entry.
- RLS: tables are public-readable; only `can_manage_shop` users can write fitment rows.

## Server changes (`src/lib/shop.functions.ts`)

- `listVehicleMakes()` — returns makes grouped by car/motorcycle.
- `listVehicleModels({ makeId })` — returns models + year ranges.
- Extend `listShopProducts` input with `{ make?, model?, year?, universalOnly? }`. Filter:
  - product is universal_fit, OR
  - exists a `shop_product_fitment` row where make matches (or null), model matches (or null), and year is in `[year_start, year_end]` (nulls = open-ended).
- `getShopProduct` also returns the product's fitment rows so the detail page can render them.

## Admin changes (`src/routes/admin.shop.tsx`)

- New **Fitment** tab on the product editor: searchable Make → Model → Year-range chips, plus a "Universal fit" checkbox. Reuses the same dropdown component as the public selector.
- Bulk action: "Mark selected as universal fit" for tools/detailing items.

## Components

- `src/components/shop/vehicle-fitment-picker.tsx` — reusable Make/Model/Year selector (used in hero, header pill, and admin).
- `src/lib/garage.ts` — tiny localStorage helper (`getGarage()`, `setGarage()`, `clearGarage()`) + a React hook `useGarage()`.
- Update `AdCarousel` to accept `{ vehicle }` and forward to `listActiveAds`.

## URL contract

`/shop`, `/shop/$category`, `/shop?make=Toyota&model=Vios&year=2018&fit=strict|universal`

Validated with `zodValidator` + `fallback()`; `loaderDeps` picks only `{ make, model, year, fit }` so unrelated param changes don't refetch.

## Out of scope (suggest as follow-ups)

- VIN decode lookup (would need a 3rd-party API key).
- Sub-model / trim / engine code fitment (Civic FE vs FL etc.) — phase 2.
- Fitment-based ride recommendations on `/rides` (separate feature).

## Open questions

1. Should the garage support **multiple saved vehicles** (eBay-style "My Garage" list), or just one active vehicle for now?
2. For motorcycles — same picker, or a separate "Bike Garage"?
3. Should the fitment filter be **strict** (hide non-matching products) or **soft** (show all, but float matching ones to the top)?
