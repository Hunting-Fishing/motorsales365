# Build: Cardomain-style "My Rides" feature

A vehicle profile system where users showcase their cars/bikes/trucks — specs, mods, service history, ownership history, photo gallery — with a public `/rides` hub and tie-in to marketplace listings.

## What gets built

### 1. Database (one migration)

New tables (all RLS-enabled, public read for `published`, owner-write):

- **`rides`** — one row per vehicle
  - Owner: `user_id`
  - Identity: `slug`, `name` (nickname like "Project Stancekipo"), `year`, `make`, `model`, `trim`, `color`
  - Drivetrain: `engine`, `transmission`, `drivetrain`, `mileage_km`, `vehicle_type` (car/truck/motorcycle/etc.)
  - Story: `description` (long form), `cover_photo_url`
  - Status: `status` (`draft` / `published` / `archived`), `is_for_sale`, `linked_listing_id` (nullable → `listings.id`)
  - Social: `view_count`, `like_count`
  - Standard: `created_at`, `updated_at`, `published_at`
- **`ride_photos`** — gallery (url, caption, sort_order, ride_id)
- **`ride_mods`** — modifications (category enum: engine/suspension/wheels/exterior/interior/audio/electronics/other, part_name, brand, cost_php, installed_on, notes)
- **`ride_service_log`** — maintenance/milestones (date, type, mileage_km, notes, photo_url, cost_php)
- **`ride_ownership`** — chain of ownership (owner_name, acquired_on, sold_on, notes)
- **`ride_likes`** — `(ride_id, user_id)` for hearts on the hub
- Storage bucket **`ride-media`** (public) + RLS policies (owner-write, public-read)

### 2. Routes

| Route | Purpose |
|---|---|
| `/rides` | Public hub: grid of published rides, filter by make/model/year/region/vehicle_type, sort by newest/most-liked, featured row up top |
| `/rides/$slug` | Public ride profile: cover hero, spec sheet, photo gallery, mods table, service timeline, ownership chain, owner card, "For sale" CTA when linked |
| `/dashboard/rides` | List of my rides + "Add a ride" button |
| `/dashboard/rides/new` | Create wizard (basics → photos → mods → publish) |
| `/dashboard/rides/$id/edit` | Tabbed editor: Details · Photos · Mods · Service log · Ownership · Settings (link/unlink listing, archive) |

### 3. Listing ↔ Ride linkage (both directions)

- **From ride editor**: "List this ride for sale" button → opens `/sell` prefilled with year/make/model/trim/color/mileage/photos/description from the ride, and on submit sets `rides.linked_listing_id` + `is_for_sale = true`.
- **From `/sell`**: when user has rides, show "Or list from one of your rides →" picker that prefills the form.
- When the linked listing transitions to `sold`, auto-clear `is_for_sale` (DB trigger) and surface "Sold!" badge on the ride.

### 4. UI building blocks (new components)

- `ride-card.tsx` — hub grid card (cover, name, year/make/model, owner, like count)
- `ride-spec-sheet.tsx` — formatted spec table
- `ride-mod-table.tsx` — editable mod list (used in dashboard) + read-only variant for public page
- `ride-service-timeline.tsx` — vertical timeline
- `ride-ownership-list.tsx` — ownership chain
- `ride-photo-gallery.tsx` — lightbox-capable gallery
- `ride-form-*` editors (one per tab)

Reuse existing: `vehicle-picker`, `location-picker`, `tag-picker`, `image-with-skeleton`, `verified-badge`, shadcn primitives.

### 5. SEO

Each `/rides/$slug` gets its own `head()` — title `"{year} {make} {model} — {nickname} | 365 MotorSales"`, og:image = cover photo, JSON-LD `Vehicle` schema. `/rides` hub gets a hub-level meta. Sitemap includes all published rides.

### 6. Profile integration

On `/seller/$id` add a "Rides" tab showing the user's published rides above their listings.

## Out of scope (v1)

- Comments / replies on rides (likes only)
- Build journal / dated posts (we picked single profile, not journal)
- Follow / subscribe to a builder
- VIN decoder
- Importing rides from Instagram/FB

These can be added later without schema changes (except journal posts).

## Technical notes

- All write paths go through `createServerFn` with `requireSupabaseAuth` (slug generation, listing-link operations, like toggling).
- Public reads on `/rides` and `/rides/$slug` use the browser client with RLS (`status = 'published'`).
- Slugs auto-generated server-side: `{year}-{make}-{model}-{6char}` (collision-safe).
- Photo uploads via the same `storage-upload.ts` helper used by listings.
- Like toggling is optimistic in the UI, persisted server-side.

## Build order

1. Migration (tables + bucket + RLS + sold-trigger)
2. Dashboard CRUD (`/dashboard/rides`, new, edit tabs) — so users can create data
3. Public ride profile `/rides/$slug` with SEO
4. Public hub `/rides` with filters + likes
5. Listing ↔ ride linkage (both directions)
6. Profile tab on `/seller/$id` + sitemap entry

After approval I'll run the migration first, wait for your sign-off, then build the routes/components.
