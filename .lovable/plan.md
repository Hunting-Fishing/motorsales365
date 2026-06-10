## Goal
Seed 10 published marketplace listings of iconic rally/JDM cars (no trademark logos), each with a watermarked hero photo, so the marketplace looks alive during sales-rep demos.

## The 10 cars
1. 1986 Toyota Corolla AE86 Levin — coupe, RWD
2. 1991 Nissan Skyline GT-R R32
3. 1992 Nissan Silvia S13
4. 1990 Nissan Fairlady Z (Z32)
5. 1994 Nissan 180SX
6. 1985 Toyota Celica GT-Four ST165 (Rally)
7. 1995 Mitsubishi Lancer Evolution III
8. 2002 Subaru Impreza WRX STI (GD)
9. 1993 Mazda RX-7 FD3S
10. 1994 Toyota Supra Mk4 (A80)

All marked with a translucent diagonal **"DEMO — 365 MotorSales"** watermark across the hero image. No real-brand badges/logos in the prompts — generic rally liveries only.

## Ownership & visibility
- Owner: existing admin profile `365 MotorSales` (`a3999f39-3641-4e16-a11b-f2b6563b8a8f`).
- `status = 'published'`, `published_at = now()`, `source = 'demo_seed'` (lets us delete them later in one query).
- `category_slug = 'car'`, `seller_type = 'private'`, spread across a few PH cities (Manila, Cebu, Davao, Quezon City, Cavite).
- Realistic PHP `price_php`, a couple `negotiable = true`, none price-hidden.

## Image generation
- Generate 10 hero JPGs at 1280×960 via imagegen `fast` tier, each prompt: tasteful 3/4 exterior shot of the generic car on tarmac, no badges/text, "with a large translucent diagonal watermark reading 'DEMO — 365 MotorSales' across the image".
- Save to `/tmp/demo-seed/*.jpg`, upload each via `lovable-assets` CLI, write `.asset.json` pointers under `src/assets/demo-listings/`.
- Use the resulting CDN URLs in `listing_media.url` (one photo per listing, `sort_order = 0`, `type = 'image'`).

## DB writes
One `INSERT` into `listings` (10 rows) + one `INSERT` into `listing_media` (10 rows) via the insert tool. No schema changes. No new tables, policies, or migrations.

## Cleanup hook
Because every row has `source = 'demo_seed'`, the whole set can be removed later with:
```sql
DELETE FROM listings WHERE source = 'demo_seed';
```

## Out of scope
- No watermark on titles (visual watermark only, per your pick).
- No edits to listing-card / detail / search components.
- No seeded ride-garage, business, or tow data.
