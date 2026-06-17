# Contact Details Upgrade — FB Page, WhatsApp, Brands Table

Goal: extend the "Contact details" card so businesses can capture their Facebook Page link and WhatsApp number, and replace the free-text "Brands carried" textarea with a structured, chip-style brand picker that suggests brands based on the business type (Toyota/Honda for dealers, Michelin/BFGoodrich for tire shops, Shell/Mobil for fuel, etc.) with manual add still allowed.

## Changes

### 1. Database (migration)
- Add to `businesses`:
  - `facebook_url TEXT` (nullable)
  - `whatsapp_number TEXT` (nullable, stored as E.164 like `+639XXXXXXXXX`)
- New table `business_brands`:
  - `id`, `business_id` (FK → businesses, on delete cascade), `name TEXT NOT NULL`, `slug TEXT` (lowercased, for filter joins later), `sort_order INT`, `created_at`
  - Unique `(business_id, slug)` to prevent dupes
  - RLS: owner can CRUD their rows; `anon`+`authenticated` can SELECT (public directory needs to read brands per business)
  - GRANTs: anon SELECT; authenticated SELECT/INSERT/UPDATE/DELETE; service_role ALL
  - Index `(business_id, sort_order)` and `(slug)` for future filtering

### 2. Brand suggestions catalog (`src/data/brand-suggestions.ts` — new)
Per `business_kind`, a curated list of common brands in the Philippine market:
- dealership / used_dealership / rental / corporate: Toyota, Honda, Mitsubishi, Nissan, Ford, Hyundai, Kia, Suzuki, Chevrolet, Isuzu, Mazda, MG, Geely, BYD, Foton, Subaru, Lexus, BMW, Mercedes-Benz, Audi
- motorcycle_shop: Honda, Yamaha, Suzuki, Kawasaki, KTM, Royal Enfield, Rusi, Kymco, SYM, Vespa
- tire_shop: Michelin, Bridgestone, Yokohama, BFGoodrich, Goodyear, Dunlop, Continental, Pirelli, Maxxis, GT Radial, Westlake, Toyo
- battery_shop: Motolite, Amaron, GS, 3K, Yuasa, ACDelco
- fuel_station: Shell, Petron, Caltex, Phoenix, Total, Seaoil, Cleanfuel, Unioil
- parts_accessories / accessories: Bosch, Denso, NGK, Brembo, KYB, Monroe, Sachs, Mann-Filter, OEM
- carwash / audio_tint: 3M, Meguiar's, Chemical Guys, Sonax, Llumar, V-Kool, Solar Gard
- repair_shop / body_paint: Bosch, Castrol, Mobil 1, Shell Helix, 3M, Sikkens, PPG, DuPont
- towing: (typically empty — show a small "Service brands you partner with" hint)
- Fallback for `other` / unknown: generic top OEMs

Export: `getBrandSuggestions(kind: string | null | undefined): string[]`

### 3. UI — `src/routes/dashboard.businesses_.$id.edit.tsx` (ProfileTab Contact details card)
Layout stays as a single card with two-column grid; mobile responsive.
- Row 1: Phone | Email
- Row 2: Website | Messenger URL
- Row 3 (new): Facebook Page URL | WhatsApp number (PH-aware input with `+63` hint, auto-normalize)
- Brands carried section replaces the textarea with:
  - Chip list of currently saved brands (× to remove, drag-to-reorder optional via simple up/down — skip for now, use insertion order)
  - Inline input + Add button (Enter to add)
  - Suggested chips (dashed style) below input: top 8 from `getBrandSuggestions(biz.business_kind)`, "+N more" popover for the rest
  - Click suggestion → instantly added; duplicates (case-insensitive) ignored
  - All edits are local state; persisted on Save

### 4. Server save (`src/lib/business-pages.functions.ts` → `updateBusinessPageSettings`)
- Extend schema with `facebook_url: lenientUrl(500)`, `whatsapp_number: z.string().max(40).nullable().optional()` (normalize to E.164 `+63…` server-side; strip spaces/dashes)
- Accept `brands: z.array(z.object({ name: z.string().min(1).max(80) })).max(60).optional()`
- When `brands` is provided: delete existing `business_brands` rows for the business and re-insert in order (simple, atomic enough for this scale). Compute `slug` = lowercase + collapse whitespace + remove non-alphanumeric.
- Drop the legacy `brands_carried` write (keep column for back-compat; do not surface in editor).

### 5. Loader / public page
- `src/lib/business-pages.functions.ts` loader: also select `facebook_url`, `whatsapp_number`, and fetch `business_brands` ordered by `sort_order`.
- `src/routes/businesses.$slug.tsx`:
  - In the contact rail, add Facebook and WhatsApp icon buttons when set (WhatsApp deep-links to `https://wa.me/<digits>`).
  - Render brands as a chip list (replacing the current `brands_carried` line), falling back to `brands_carried` only if no rows exist (legacy data).

### 6. Terms sync
- `/terms` "Last updated" bump (data collection now stores Facebook URL, WhatsApp number, and a structured brands list per business).

## Out of scope (next iteration)
- Public directory filter "Carries brand: Toyota" — table + slug are set up for it, but the filter UI/query is not built here.
- Brand logos / icons.
- Drag-reorder of brand chips.
- Admin moderation of custom brand names.

## Files
- New migration (columns + `business_brands` table + grants + RLS + indexes)
- `src/data/brand-suggestions.ts` (new)
- `src/lib/business-pages.functions.ts` (schema + save + loader)
- `src/routes/dashboard.businesses_.$id.edit.tsx` (Contact details card + brands chip editor)
- `src/routes/businesses.$slug.tsx` (FB + WhatsApp buttons, brands chips)
- `src/routes/terms.tsx` (Last updated date)
