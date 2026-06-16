# Overhaul `business_tags` — fill the gaps the directory exposes

## Why this is needed
- `Hours` is missing **Walk-ins welcome** (it currently lives miscategorized under `service_mode`), plus Early mornings, Late nights, Holidays open, etc.
- `Towing › Equipment` only has 4 chips. Tow industry needs ~20+: light/medium/heavy/super-heavy wreckers, flatbed/rollback, integrated, rotator, wheel-lift, underlift, dolly/skates, car carrier, lowboy, container/box hauler, motorcycle cradle, off-road/4x4 recovery, winch capacity tiers, air-cushion/snatch blocks, etc.
- 11 of the 23 business kinds have **zero tags today**: `motorcycle_shop, rental, battery_shop, accessories, audio_tint, inspection, driving_school, lto_services, financing, transport, corporate` — they show an empty Tags dialog.
- Several kinds with tags are thin (carwash, salvage, insurance, body_paint).

## What the migration does
One SQL migration inserts/updates rows in `public.business_tags` (admin-managed table, public read). No schema change, no app code change.

### Global tags (type_slug = NULL — shown to every business)
- **Hours** (expanded): keep Open 24/7, Open Sundays, By appointment. Add **Walk-ins welcome**, **Open holidays**, **Open public holidays**, **Early mornings (before 7am)**, **Late nights (after 9pm)**, **Open lunch**, **Same-day service**, **Emergency after-hours**. Move `walk-in` chip from `service_mode` → `hours` (re-slug or update category).
- **Service mode**: add Drive-thru, On-site, Drop-off, Loaner vehicle, Free pickup within zone, Nationwide shipping.
- **Trust / credentials**: add DTI-registered, BIR-registered, SEC-registered, BPLS / Mayor's permit, Senior/PWD discount, Veteran-owned, OFW-friendly, Cash-on-arrival deposit only, Insured operator, Bonded.
- **Payment**: add PayMaya QR, Bayad Center, 7-Eleven CLiQQ, Coins.ph, USDT/Crypto, Cheque, PO / Net-30 (corporate), Fleet account.
- **Language**: add Cebuano, Hiligaynon, Ilocano, Bikol, Waray, Kapampangan, Pangasinense, Chavacano, Tausug, Korean, Japanese, Chinese (Mandarin).

### Towing (`type_slug = 'towing'`) — the headliner
Replace the current 13 chips with a richer set across these categories:
- **Equipment**: Flatbed / rollback, Wheel-lift, Underlift, Integrated wrecker, Light-duty wrecker, Medium-duty wrecker, Heavy-duty wrecker, Super-heavy wrecker, Rotator, Lowboy trailer, Car carrier (2-car), Container hauler, Box truck, Motorcycle cradle, Motorcycle trailer, ATV/UTV recovery sled, Wheel skates / dollies, Air cushion recovery, Snatch blocks, Self-loader.
- **Capacity (GVWR)**: Up to 3.5T, 3.5–7.5T, 7.5–18T, 18–35T, 35T+, 50T+ rotator.
- **Service**: 24/7 dispatch, Long-distance / interprovincial, Accident recovery, Winch-out, Off-road recovery, Ditch recovery, Water recovery, Repo / impound, Illegal-parking removal, Auction / lot transport, Dealer transport, Fleet recovery, Heavy-equipment transport, Boat / jet-ski transport, Container drayage, Motorcycle transport, EV-certified transport, Luxury / exotic transport, Classic-car transport, Race-car transport.
- **Roadside**: Jumpstart, Lockout, Fuel delivery, Roadside tire change, Battery swap, Mobile tire repair, Mobile mechanic call-out, Coolant top-up, Air refill, On-scene minor repair.
- **Coverage**: Within city, Provincial, Regional, Nationwide, NLEX/SLEX, SCTEX/TPLEX, CALAX, NAIAX/Skyway, Subic/Clark corridor, Mountain routes (Kennon/Marcos Hwy).
- **Insurance partners** (optional, popular only): BPI/MS, Standard, Malayan, Pioneer, FPG, Etiqa, Charter Ping An, AON, Direct PMS billing.
- **Specialty**: EV-trained crew, Hybrid-trained crew, Diesel rescue, LPG/CNG-safe handling, Hazmat-aware, Tow + storage yard, Police/LTO accredited, Insurance accredited.

### Other empty / thin kinds — seed tag sets
For each kind below, add a focused 8–20-tag starter set across `equipment / service / vehicle_scope / specialty / trust` as appropriate. Examples:
- **motorcycle_shop**: bike types served (scooter, big bike, underbone, electric, off-road), services (tune-up, valve adjust, chain, suspension, ECU flash, dyno), brands (Honda, Yamaha, Suzuki, Kawasaki, KTM, BMW, Ducati), gear (helmet, riding gear).
- **rental**: vehicle types (sedan, SUV, AUV, van, pickup, motorcycle, luxury, exotic), terms (hourly, daily, weekly, monthly, long-term, with driver, self-drive), services (airport delivery, chauffeur, wedding car, film/TV rental, corporate).
- **battery_shop**: chemistries (Lead-acid, AGM, Gel, LiFePO4), services (Free install, Battery test, Mobile install, Trade-in), brands (Motolite, Amaron, Yuasa, Bosch, Varta).
- **accessories / audio_tint**: tint shades, audio brands, dashcam, lighting, alarms, remote-start, smart keys.
- **inspection**: PMVIC, smoke emission, OBD-II diagnostics, dyno, brake test, headlight aim.
- **driving_school**: manual, automatic, motorcycle, defensive driving, TESDA NC II, LTO TDC, foreign-license conversion, in-English instruction.
- **lto_services**: renewal, transfer, plates, conduction sticker, OR/CR replacement, change color, change body type, fixer-free.
- **financing**: bank loan, in-house, lease-to-own, BPI Auto, Security Bank, BDO, EastWest, Maybank, downpayment-free, no-show-money.
- **transport**: 4-wheel, 6-wheel, 10-wheel, container, refrigerated, hauling, last-mile, intercity, NCR delivery, nationwide.
- **corporate**: fleet management, GPS tracking, telematics, driver supply, maintenance contracts, fuel cards.
- **carwash** (expand): ceramic coating, paint correction, PPF, leather treatment, engine bay, headlight restoration, motorcycle wash, truck/bus wash.
- **salvage** (expand): cash for clunkers, parts buyback, hauling, certified scrap, LTO deregistration, copper/aluminum/iron, fleet retirement.
- **insurance** (expand): TPL only, comprehensive, CTPL, AOG (acts of god), Bodily injury, Property damage, Excess waiver, Tow-included, 24/7 claims, In-house adjuster.
- **body_paint** (expand): PDR (paintless dent repair), full repaint, color match, ceramic coat, headlamp restore, plastic repair, frame straightening, classic-car restoration, motorcycle paint, custom airbrush, wrap removal.

## Technical notes
- One idempotent migration using `INSERT ... ON CONFLICT (slug) DO UPDATE SET label, category, type_slug, sort_order, is_popular, description`. Slugs use kebab-case prefixed by kind when needed (`tow-rotator`, `moto-scooter`) so global vs scoped tags don't collide.
- `walk-in` row: update category from `service_mode` → `hours` (keep slug for back-compat with any existing `business_tag_links`).
- `is_popular = true` only on the ~3 highest-intent tags per category so the "Top" view stays clean.
- `sort_order` increments by 10 within each (type_slug, category) for easy future inserts.
- Total new/updated rows: ~280–320. Pure data — no RLS, types, or component changes.

## Files
- New: `supabase/migrations/<ts>_expand_business_tags.sql`

After it lands, the existing `BusinessTagsDialog` will render the richer set automatically (it already groups by category and respects `is_popular`).
