
## Issue #3 — Seed Sample Listings

Database currently has **0 listings**, so the homepage and category pages show "No listings yet — be the first to post one." Per the audit, the fix is to seed example inventory that is clearly marked as a sample so visitors see a populated marketplace without us misrepresenting real stock.

### Approach

Insert ~12 seed listings via a single SQL migration, owned by the existing platform profile **"365 MotorSales"** (`a3999f39-3641-4e16-a11b-f2b6563b8a8f`). Every seed is tagged so we can find and bulk-remove them later, and every title is prefixed `[Sample]` so users immediately understand these aren't live stock.

### Seed mix (12 listings)

Across PH regions (NCR, Region I / Ilocos, Region VII / Cebu, Region XI / Davao) and price bands:

**Cars (5)**
- [Sample] 2019 Toyota Vios 1.3 E MT — ₱525,000 — Quezon City, NCR
- [Sample] 2021 Honda City 1.5 S CVT — ₱768,000 — Cebu City, Region VII
- [Sample] 2017 Mitsubishi Montero Sport GLS — ₱899,000 — Davao City, Region XI
- [Sample] 2015 Toyota Hilux G 4x2 MT — ₱720,000 — Laoag City, Region I
- [Sample] 2022 Ford Ranger XLT 2.0 AT — ₱1,395,000 — Makati, NCR

**Motorcycles (4)**
- [Sample] 2023 Honda Click 160 — ₱115,000 — Quezon City
- [Sample] 2020 Yamaha NMAX 155 — ₱98,500 — Cebu City
- [Sample] 2019 Kawasaki Rouser NS200 — ₱82,000 — Davao City
- [Sample] 2024 Yamaha Mio Gear — ₱72,500 — Vigan, Region I

**Other vehicles (3)**
- [Sample] 2018 Isuzu Elf 4HK1 Dropside — ₱785,000 — Pasig (category: equipment)
- [Sample] DJI Mavic 3 Pro with Fly More Combo — ₱165,000 — Makati (category: drone)
- [Sample] 2020 Yamaha WaveRunner VX Cruiser — ₱520,000 — Mactan (category: boat)

All set to `status='active'`, `plan='standard'`, `seller_type='private'`, `published_at=now()`, `expires_at=now()+60 days`, with a short description noting "Sample listing for platform demonstration — not real stock." `attributes` will carry `{"seed": true, "sample": true}` for easy filtering/removal.

### Photos

Each listing gets 1 placeholder image row in `listing_media` using a stable Unsplash URL relevant to the vehicle (cars/bikes/etc.). No uploads needed — these are external URLs the existing `ListingCard` already handles.

### What we will NOT do

- No fake reviews, fake user accounts, or fake message threads.
- No paid-tier or boosted seeds (keeps boost ranking honest).
- No edits to listing UI, RLS, or any business logic — pure data seed.
- No changes to the Terms / Privacy pages (no policy impact).

### Files / changes

1. **Supabase migration** — inserts 12 rows into `listings` + 12 rows into `listing_media`, all owned by the 365 MotorSales profile, all flagged `attributes->>'seed' = 'true'`.
2. **`.lovable/june7-audit.md`** — mark item #3 done with a one-line progress log entry noting the seed count, owner, and the "remove via `attributes->>'seed'`" cleanup recipe.

### Verification

After the migration runs:
- `SELECT count(*) FROM listings WHERE status='active'` → 12
- Visit `/` and `/browse/car`, `/browse/motorcycle` — cards render with `[Sample]` prefix and the placeholder photo.
