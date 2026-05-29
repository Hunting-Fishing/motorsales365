## Goal

Make the Tags tab for fuel stations cover everything a station actually sells or offers, and let owners add their own tags that grow the shared database — including "Sari-Sari Store".

## 1. Expand the fuel-station tag catalog (migration, seeded into `business_tags`)

The current catalog has 37 tags across `fuel_grade`, `ev_charging`, `station_services`. We'll add many more, grouped:

**fuel_grade** (add)
- Premium 95 (e.g. XCS/Blaze 95), Premium 97/98, Racing 100 (Blaze 100), Standard Diesel, Premium Diesel (Diesel Max/Turbo Diesel/Diesel Xtra), Bio-Diesel B2, E85.

**station_services** (add)
- Quick-serve food, Coffee bar, Fast-food tenant (Jollibee/McDo/etc.), Pharmacy, Seating area, Wi-Fi, Mobile load / e-load, Bills payment, Remittance, GCash cash-in, Package pickup (Lalamove/Grab drop), Parking, Truck parking, Diesel for trucks (high-flow), Motorcycle lane, PWD-accessible, Prayer room, Baby changing.

**station_products** (new category)
- Sari-Sari Store, Engine oil, Coolant, Brake fluid, Wiper fluid, Lubricants (drums), Batteries, Tires, Tire sealant, Air fresheners, Snacks & drinks, Ice, Cigarettes/Vape (regulated), LPG cylinders for sale.

**station_payment** (new category)
- Cash, Credit card, Debit card, GCash, Maya, QR Ph, Fleet card (Petron/Shell/Caltex), Corporate account.

**station_brand** (new category, optional brand of station)
- Petron, Shell, Caltex, Phoenix, Seaoil, Cleanfuel, Total/TotalEnergies, Unioil, Flying V, PTT, Jetti, Independent.

All inserted with `type_slug = 'fuel_station'`, sensible `sort_order`, `is_popular` set on the common ones (91/95/Diesel/Sari-Sari/Convenience store/Restrooms/24-7).

Run as a single `INSERT ... ON CONFLICT (slug) DO NOTHING` migration so it's idempotent.

## 2. User-submitted tags (custom tag input)

Add a "+ Add your own tag" input at the bottom of each category and a free-form one at the top of the Tags tab.

Flow when an owner submits a new tag name:
1. Slugify the label (`station-tag-<kebab>`) client-side.
2. Call a new SECURITY DEFINER RPC `suggest_business_tag(_label text, _type_slug text, _category text)` that:
   - Validates length (2–40 chars), trims, ensures auth user owns at least one business.
   - Inserts into `business_tags` `ON CONFLICT (slug) DO NOTHING` with `sort_order = 1000` and `is_popular = false`.
   - Returns the canonical slug.
3. Auto-selects the returned slug for the current business (insert into `business_tag_links`).
4. Refreshes the local tag list so it appears in the right category and is selectable for everyone else going forward.

This satisfies "Enter your own that adds to the database so users can help grow it." Admins can later curate / merge duplicates in the admin panel (existing `Admins manage business tags` policy already allows that — no UI change needed in this pass).

## 3. UI changes in `dashboard.businesses_.$id.edit.tsx` `TagsTab`

- Add a `CATEGORY_LABELS` entry + ORDER for the new categories: `fuel_grade`, `ev_charging`, `station_services`, `station_products`, `station_payment`, `station_brand`.
- Per-group "Add custom…" inline input → calls the RPC with that category.
- Toast on success/duplicate/error. No business-logic changes elsewhere.

## 4. Sari-Sari Store

Seeded as `station-sari-sari-store` under `station_products`, `is_popular = true`, so it's visible by default on every fuel station.

## Out of scope

- No schema changes to `business_tag_links`.
- No changes to public business page rendering (already reads from `business_tag_links` + `business_tags`).
- No admin moderation UI for suggested tags in this pass (admins can edit via existing policies / SQL).

## Files touched

- New migration: seed tags + create `suggest_business_tag` RPC + grants.
- `src/routes/dashboard.businesses_.$id.edit.tsx` — extend `TagsTab` with custom-tag input and new category labels/order.
