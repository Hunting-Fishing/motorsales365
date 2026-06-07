## Goal

Turn `/advertise` from a single contact form into a real self-serve sponsorship intake that mirrors every advertisable surface in the app (Marketplace, Learn, Businesses, Rides, Shop, Export, Newsletter, etc.), and make sure every selection flows cleanly into the existing admin advertising console.

## What's there today

- `/advertise` has 6 generic placements (`homepage_banner`, `category_banner`, `listing_sidebar`, `newsletter`, `sponsored_post`, `other`) and one free-text message.
- DB enum `ad_placement` already supports a richer set: `homepage_banner`, `home_carousel`, `category_banner`, `browse_top`, `rides_top`, `export_top`, `shop_top`, `shop_sidebar`, `listing_sidebar`, `newsletter`, `sponsored_post`, `other`. Learn / Academy has no dedicated enum value (currently bundled under `sponsored_post`).
- `ad_inquiries` only stores placement + message + budget + start date. No section, format, duration, end date, creative-ready flag, or target URL.
- Admin (`/admin/advertising`) reads/edits this table and has a separate `/admin/ad-campaigns` for live `advertisements`. Today it shows only `placement` — it needs to surface the new structured fields.

## New `/advertise` page structure

1. **Hero** — value prop + "View placement catalog" anchor + "Request a sponsorship" anchor.
2. **Placement catalog** (visual grid, the core upgrade). Each card shows:
   - Location (where on the site it appears) with a small wireframe/preview thumbnail
   - Supported formats (banner, carousel slide, sponsored card, sidebar tile, newsletter slot, sponsored lesson/Academy card)
   - Audience note (who sees it)
   - Typical pricing tier badge (Starter / Growth / Premium) — labels only, no hard price
   - "Select this placement" button → scrolls to form and prefills `section` + `format`
3. **Sections covered** (drives the `section` field):
   - `marketplace_home` — Homepage hero/carousel
   - `marketplace_category` — Cars / Motorcycles / Boats / Airplanes / Heavy Equipment / Parts category pages
   - `marketplace_listing` — Listing detail sidebar
   - `browse` — Browse results top banner
   - `rides` — Rides feed top
   - `export` — Export inquiries top
   - `shop` — Shop top + sidebar
   - `learn` — Academy / Learn rail (Sponsor your Academy spot)
   - `businesses` — Business directory featured spot
   - `newsletter` — Email newsletter sponsorship
   - `custom` — Something else
4. **Multi-step request form** (replaces the current single form):
   - Step 1 — Placement (section + format, prefilled from catalog click; multi-select allowed)
   - Step 2 — Campaign details (target URL, creative-ready toggle, target audience notes, start date, end date / duration, monthly budget range)
   - Step 3 — Contact (name, company, email, phone)
   - Review + submit
5. **Trust strip** at the bottom: "All submissions reviewed by our advertising team" + link to `/dashboard/sponsorships` for status.

## Data changes (single migration)

Extend `ad_inquiries` with structured fields. Keep `placement` for back-compat and continue writing the primary section value into it.

- Add enum value `learn_rail` to `ad_placement` (so Academy/Learn is first-class, not bundled under `sponsored_post`).
- Add columns to `ad_inquiries`:
  - `sections text[]` — multi-select of section keys above
  - `formats text[]` — e.g. `banner`, `carousel_slide`, `sidebar_tile`, `sponsored_card`, `newsletter_slot`, `academy_card`
  - `target_url text`
  - `end_date date`
  - `duration_days int`
  - `creative_ready boolean default false`
  - `audience_notes text`
- Backfill: copy existing `placement` into `sections` for old rows.
- Audit: extend the existing `tg_audit_ad_inquiry` `changes` field to include the new columns so the timeline diff already built keeps working.
- RLS: no policy changes; existing submitter/admin policies cover the new columns.

## Admin integration (`/admin/advertising`)

- Inquiry list row: show first section + formats count instead of raw enum.
- Detail panel additions:
  - Sections (badges, editable multi-select)
  - Formats (badges, editable multi-select)
  - Target URL (link out)
  - End date / duration
  - Creative-ready indicator
  - Audience notes (read-only block)
- Filters: add Section and Format filter chips above the list.
- "Convert to campaign" affordance: a button that deep-links to `/admin/ad-campaigns` with the inquiry's section/format/target URL prefilled in querystring (no schema change to `advertisements` needed).
- Approval/rejection flow (already built) is unchanged; rejected sponsors keep editing via `/dashboard/sponsorships`.

## Files touched

- `supabase/migrations/<new>.sql` — enum value + new columns + backfill + audit trigger update.
- `src/routes/advertise.tsx` — full rebuild: catalog grid, multi-step form, prefill logic, new schema.
- `src/components/advertise/placement-catalog.tsx` *(new)* — catalog card grid + section/format metadata source of truth.
- `src/components/advertise/placement-preview.tsx` *(new)* — tiny SVG wireframes per section.
- `src/routes/admin.advertising.tsx` — list row + detail panel + filters + "Convert to campaign" link; show new fields; render sections/formats in timeline labels.
- `src/routes/dashboard.sponsorships.tsx` — display sections/formats badges on each card so sponsors see exactly what they requested; edit dialog updated to the new fields.
- `src/lib/email-templates/ad-inquiry-*.tsx` — include section/format summary in the confirmation, approved, and rejected emails.

## Out of scope

- No payment/checkout on `/advertise` — still inquiry-based, pricing tiers are indicative only.
- No changes to live ad delivery (`advertisements` table, ad serving) beyond the admin deep-link.
- No new public Learn-sponsor route; the existing `/advertise?section=learn` prefill from the Learn rail keeps working.

## Open question

Pricing on the catalog cards — show indicative price ranges (e.g. "₱15k–40k/mo"), show only tier labels (Starter/Growth/Premium), or hide pricing entirely and keep it conversation-only? Default if unanswered: **tier labels only**, no peso figures.
