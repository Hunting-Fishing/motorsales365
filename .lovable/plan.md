## Goal

Add a public **Businesses** section accessible from the site menu. Users can browse, search, and filter local businesses (dealerships, repair shops, parts, towing, insurance) by type and tags, see them pinned on a multi-layered Philippines map (region → province → city → barangay), open detailed profiles, leave reviews, and submit/claim a business.

## New routes

- `/businesses` — directory: search bar, type filter, tag multi-select, region/province/city/barangay drill-down, results list + map side-by-side (stacked on mobile).
- `/businesses/$slug` — business profile: cover/logo, description, type, tags, hours, contact, address, embedded map, photos, reviews list + form.
- `/businesses/submit` — owner submission form (auth required). Status `pending` until admin approves.
- `/dashboard/businesses` — owner's businesses (edit/manage).
- `/admin/businesses` — admin moderation queue (approve / reject / feature / hide).

## Database (new tables)

1. **`business_types`** (seed): `slug` (PK), `label`, `icon`, `sort_order`.
   Seed: `dealership`, `repair_shop`, `parts_accessories`, `towing`, `insurance`.
2. **`business_tags`** (seed): `slug` (PK), `label`, `type_slug` (nullable; tag can be type-scoped or global).
   E.g. `oil-change`, `body-paint`, `24-7`, `oem-parts`, `motorcycle-only`, `comprehensive-insurance`…
3. **`businesses`**:
   - `id`, `owner_id` (nullable, references auth user — null for admin-created listings), `slug` (unique), `name`, `type_slug` (FK business_types), `description`, `logo_url`, `cover_url`, `photos` (jsonb url array), `phone`, `email`, `website`, `messenger_url`, `hours` (jsonb), `region`, `province`, `city`, `barangay`, `street_address`, `lat`, `lng`, `status` (`pending`/`active`/`rejected`/`hidden`), `featured` (bool), `rating_avg` (numeric, computed via trigger), `rating_count` (int), `created_at`, `updated_at`.
4. **`business_tag_links`**: `business_id`, `tag_slug`. Composite PK.
5. **`business_reviews`**: `id`, `business_id`, `user_id`, `rating` (1–5), `body`, `status` (`active`/`hidden`), `created_at`. Unique `(business_id, user_id)` so one review per user.

RLS:
- `business_types`, `business_tags`: public read; admins manage.
- `businesses`: public read where `status='active'`; owner reads own (any status); owner inserts (status forced to `pending`); owner updates own (cannot self-approve); admins/moderators full manage.
- `business_tag_links`: public read; owner manages own; admins manage.
- `business_reviews`: public read where `status='active'`; auth users insert own (rating constraint); user updates/deletes own; moderators hide.

Trigger: recompute `rating_avg`/`rating_count` on review insert/update/delete.

## Map (multi-layered)

Use **Leaflet + react-leaflet** with free OpenStreetMap tiles (no API key).
- Default view: Philippines bounds.
- Pins clustered with `react-leaflet-cluster`.
- Layer hierarchy is filter-driven (not GeoJSON polygons in v1): selecting Region zooms to that region's bounds (use a static `phRegionBounds` map), Province zooms to province bounds (computed from PSGC city centroids), City zooms to that city, Barangay further narrows results.
- Each business pin uses its `lat`/`lng`; clicking opens a popup with name, type chip, rating, and a "View" link.
- For `/businesses/$slug`, a small single-pin map shows the address.

Coordinates for region/province/city centroids: bundle a compact lookup `src/data/ph-centroids.json` (generated from existing PSGC data + a public coords dataset). For barangay layer: barangay free-text + a "Use my location" button (geolocation) refines the map view; we won't bundle barangay polygons in v1 (too heavy) — barangay acts as a text filter and lat/lng store.

## Files to create

- migration: tables, RLS, trigger, seed types & starter tags.
- `src/lib/businesses.functions.ts` — `listBusinesses`, `getBusinessBySlug`, `submitBusiness`, `updateBusiness`, `addReview`, admin `moderateBusiness`.
- `src/components/businesses/business-map.tsx` — Leaflet map with clustered pins, accepts `businesses[]` + active region/province/city.
- `src/components/businesses/business-card.tsx` — list row.
- `src/components/businesses/business-filters.tsx` — type, tags, region/province/city/barangay drill-down (reuses PSGC helpers).
- `src/components/businesses/review-form.tsx` + `review-list.tsx`.
- `src/components/businesses/location-drilldown.tsx` — wraps the 4-level cascading selects.
- `src/data/ph-centroids.json` — region+province+city → lat/lng + bounds.
- `src/routes/businesses.index.tsx`, `src/routes/businesses.$slug.tsx`, `src/routes/businesses.submit.tsx`.
- `src/routes/dashboard.businesses.tsx`.
- `src/routes/admin.businesses.tsx`.

## Files to edit

- `src/components/site-header.tsx` — add **Businesses** entry in desktop nav and mobile sheet (between Equipment and Towing per screenshot order, or after Towing — your call).
- `src/routes/admin.tsx` — add Businesses admin nav entry (icon `Store`, roles `["admin","moderator"]`).
- `src/routes/dashboard.tsx` — add "My Businesses" nav entry.
- `package.json` — add `leaflet`, `react-leaflet`, `react-leaflet-cluster`, `@types/leaflet`.

## Out of scope (v1)

- Real barangay polygon overlays (would require ~42k features). Barangay is a text/location filter only.
- Business messaging inbox (reuse existing `messages` table later if needed — for now contact is phone/email/website/messenger link).
- Paid business plans / boosting (can layer on existing subscription tables later).
- Bulk import / CSV onboarding.

Approve and I'll build it.
