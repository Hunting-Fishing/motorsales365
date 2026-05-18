## Goal
Replace the small `business_tags` set (currently ~26 rows) with a comprehensive, categorized library (~250+ tags) on `/businesses/submit`. Show only the top 10 most-popular tags inline, with a "Browse all tags" button that opens a categorized picker dialog.

## 1. Database — expand `business_tags`

Add two columns and reseed:

- `category` (text) — sub-group within a business type (e.g. `engine`, `body`, `tires`, `diagnostics`, `vehicle_scope`, `payment`, `hours`). Used to group tags in the picker.
- `is_popular` (boolean, default false) — flags the top 10 to show inline per business type.

Reseed `business_tags` with a much larger library per `type_slug`:

- **repair_shop** (~70 tags): oil change, tune-up, brake service, brake rotor resurfacing, clutch replacement, timing belt, timing chain, water pump, radiator service, coolant flush, transmission flush, CVT service, AT/MT repair, differential service, suspension, shock/strut, ball joints, tie rods, wheel bearings, alignment, tire mount/balance, TPMS, AC recharge, AC compressor, heater core, electrical diagnostics, alternator, starter, battery service, ECU scan/reflash, OBD diagnostics, check-engine light, fuel system clean, fuel pump, injectors, EGR clean, DPF clean, turbo service, engine overhaul, head gasket, valve adjustment, exhaust repair, muffler, catalytic converter, pre-purchase inspection, LTO inspection, emission test prep, roadside assist, mobile mechanic, vehicle scope tags (cars, SUVs, motorcycles, trucks, vans, diesel, EV/hybrid, heavy duty), payment/hours tags.
- **body_paint / bodyshop** (~40): collision repair, dent removal (PDR), full paint, spot paint, color matching, frame straightening, bumper repair, fender repair, plastic welding, glass replacement, windshield repair, tint removal, ceramic coating, paint protection film (PPF), undercoating, rust repair, custom paint, restoration, headlight restoration, motorcycle paint, fleet repair.
- **parts_accessories** (~60): OEM parts, aftermarket, surplus/JDM, performance, body kits, lighting (LED/HID), audio/electronics, dashcams, alarms, GPS trackers, tires, mags/wheels, lift kits, lowering kits, suspension upgrades, brakes upgrade, exhaust systems, intake, ECU tuning, batteries, lubricants, filters, belts/hoses, spark plugs, mirrors, glass, interior trim, seat covers, floor mats, roof racks, tow hitches, motorcycle parts, heavy-duty parts, marine parts.
- **dealership** (~35): brand new, pre-owned, certified pre-owned, repo units, bank financing, in-house financing, trade-in accepted, low downpayment, all-in promo, fleet sales, government bids, export units, brand specialties (Toyota, Honda, Mitsubishi, Nissan, Ford, Hyundai, Kia, Suzuki, Isuzu, Mazda, Chevrolet, BYD, Geely, MG, Yamaha, Kawasaki, Harley-Davidson, etc.), vehicle scope.
- **carwash** (~20): basic wash, full detail, interior cleaning, leather treatment, engine wash, underchassis, motorcycle wash, hand wax, clay bar, headlight polish, paint correction, ceramic coating, ozone treatment, pet hair removal.
- **towing** (~15): flatbed, wheel-lift, heavy-duty, motorcycle towing, long-distance, accident recovery, winch-out, lockout, jumpstart, fuel delivery, tire change roadside, 24/7 dispatch.
- **insurance** (~15): CTPL, comprehensive, motorcycle insurance, fleet insurance, ride-hail/TNVS coverage, gap insurance, acts of nature, theft, third-party, GAP, OR/CR processing, claims assist.
- **salvage / pick-a-part** (~25): used parts, OEM used, JDM surplus, core buyback, totaled vehicle buyback, parts shipping nationwide, pick-a-part yard, motorcycle salvage, truck salvage.
- **Cross-cutting (type_slug = NULL)** (~30): payment (cash, GCash, Maya, credit card, bank transfer, installment, COD), hours (open 24/7, open Sundays, by appointment), service mode (home service, pickup & delivery, mobile service, walk-in), trust (warranty offered, LTO accredited, ISO certified, woman-owned, family-owned, English-speaking staff), languages (Filipino, English, Bisaya, Hokkien).

Mark `is_popular = true` for the most universally-relevant 10 across the platform (e.g. Oil change, Tires & alignment, Brake service, AC service, Body & paint, Detailing, Auto electrical, OEM parts, Warranty offered, Cashless transactions) — these show by default when no type is selected. Per-type popular set is the top 10 within that type by `sort_order`.

No data loss: existing `business_tag_links` keep working; we only add tags and columns.

## 2. UI — `/businesses/submit`

Replace the current single flat tag row with:

- **Inline strip (always visible):** top 10 popular tags for the selected `typeSlug` (or platform-wide popular when no type chosen). Same chip styling as today, plus chips for already-selected tags that aren't in the top-10.
- **"Browse all tags" button** next to the Tags label → opens a Dialog.
- **Dialog content:** sticky search input at top; tags grouped under category headings (`Engine & drivetrain`, `Body & paint`, `Wheels & tires`, `Diagnostics`, `Vehicle scope`, `Payment`, `Hours`, `Trust & accreditation`, etc.). Multi-select, live count, "Done" closes dialog and persists selection to the same `selectedTags` state. Search filters across label + category.
- Selected count badge on the button: `Browse all tags (4 selected)`.

Reuse the existing `business_tag_links` insert on submit — no change to write path.

## 3. Files to touch

- **migration** (single SQL): `ALTER TABLE business_tags ADD COLUMN category text, ADD COLUMN is_popular boolean DEFAULT false;` then `INSERT … ON CONFLICT (slug) DO UPDATE` for the full reseeded library.
- **edit** `src/routes/businesses.submit.tsx` — fetch new columns, split popular vs all, add Dialog with grouped picker and search.
- **edit** `src/integrations/supabase/types.ts` — regenerated automatically after migration approval.

## What we are NOT doing
- Not changing the `businesses` table or submission flow.
- Not touching `src/data/service-tags.ts` (that file powers the sell-listing flow, not business submit). Can be unified in a later pass if you want.
- Not adding tag moderation UI — admins can edit `business_tags` directly via existing admin tools later.

## Confirm before I build
1. Approve the ~250-tag scope and the categories above (or tell me to add/remove categories — e.g. EV-specific, fleet, marine).
2. Confirm "top 10" is per business type when one is selected, and platform-wide otherwise.
3. OK to also add a `category` column + `is_popular` flag to `business_tags`?
