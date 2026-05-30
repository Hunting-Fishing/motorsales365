# Business Mini-Sites → Facebook Replacement

Goal: give every Philippine business a professional, standalone-feeling presence on 365MotorSales so they can stop relying on a Facebook Page. Built in 5 phases so each ships usable.

## Phase 1 — Bookings & Availability (biggest Facebook gap)

What the owner sets up in `/dashboard/businesses/:id/edit` → new **Bookings** tab:
- **Bookable items**: pick from existing services (e.g. "Oil change", "Detailing"), set duration (15/30/60/90/120 min), buffer time, price, max concurrent bookings (e.g. 2 bays).
- **Weekly availability**: per-day open windows (reuses existing hours editor as default, overridable per service).
- **Date exceptions**: holidays / closed days / special hours.
- **Lead time & horizon**: "bookable starting X hours out, up to Y days ahead".
- **Approval mode**: auto-confirm OR manual approval.
- **Notifications**: email to owner on new booking; email/SMS confirmation to customer.

What the public sees on `/businesses/:slug` → new **Book** section + dedicated `/businesses/:slug/book` route:
- Service picker → date picker (calendar with available days highlighted) → time slot grid → contact form → confirm.
- No login required (guest bookings allowed); logged-in users get prefill.
- Confirmation page with booking reference + add-to-calendar (.ics download).

Owner inbox → new **Bookings** tab next to Inquiries:
- New / Confirmed / Completed / Cancelled / No-show.
- One-click confirm / decline / reschedule / cancel (email triggered).

## Phase 2 — Image Galleries

- New **Gallery** section on the mini-site, separate from product/service photos.
- Albums (e.g. "Shop interior", "Recent work", "Before/After").
- Multi-image upload with drag-to-reorder, captions.
- Lightbox viewer on public page with swipe on mobile.
- Storage: new `business-gallery` bucket, max 30 images per album, max 12 albums per business.

## Phase 3 — Embedded Video

- YouTube / Vimeo / Facebook Video URL field on Posts (already exists) + new dedicated **Videos** section.
- Server-side URL parsing → safe embed (no arbitrary iframes).
- Optional featured video on the cover area (replaces hero image when set).

## Phase 4 — Contact Section Polish

Already have inquiry form + call/messenger CTAs. Adds:
- **Multiple phone numbers** (sales / service / parts) with labels.
- **WhatsApp, Viber, Telegram, Instagram, TikTok** handles (PH businesses live on these).
- **Email** with anti-spam click-to-reveal.
- **Embedded map** with "Get directions" deep link to Google/Waze/Apple Maps.
- **"Send us a message"** form already exists — add file attachment (1 photo, e.g. for damage estimates).

## Phase 5 — "Your Own Domain Feel" (vanity URLs)

Two layers, both cheap:

**5a. Subdomain-style vanity slug (free, ships immediately)**
- Today: `365motorsales.com/businesses/ucatch-cook-fuels-mlpb8`
- New: owner picks a clean slug → `365motorsales.com/b/ucatchfuels` (short `/b/` prefix, vanity slug, no random suffix).
- Reserved-word list, uniqueness check, slug history table so old links 301-redirect.
- Optional: `ucatchfuels.365motorsales.com` wildcard subdomain (requires DNS wildcard + Vite route rewrite — included if you want it).

**5b. Custom domain (paid add-on, opt-in)**
- Owner adds `ucatchfuels.com` → we show DNS instructions (CNAME to our host).
- Verification via TXT record.
- Auto SSL via the hosting provider (Cloudflare/Lovable).
- This is part of the Pro / Business subscription tier — adds revenue.
- Privacy/Terms updated to mention custom domain processing.

## Technical details

```text
New tables
  business_bookable_items   id, business_id, service_id (nullable), title,
                            duration_min, buffer_min, price_php, max_concurrent,
                            require_approval, active, sort_order
  business_availability     id, business_id, weekday (0-6), start_time,
                            end_time  (multiple rows per weekday allowed)
  business_availability_exceptions
                            id, business_id, date, closed (bool),
                            start_time, end_time, note
  business_bookings         id, business_id, bookable_item_id, customer_name,
                            customer_phone, customer_email, user_id (nullable),
                            starts_at (timestamptz), ends_at, status
                            (pending|confirmed|completed|cancelled|no_show),
                            notes, created_at
  business_gallery_albums   id, business_id, title, cover_url, sort_order
  business_gallery_photos   id, album_id, url, caption, sort_order
  business_videos           id, business_id, provider (youtube|vimeo|facebook),
                            url, embed_id, title, sort_order, featured
  business_contact_channels id, business_id, kind (phone|whatsapp|viber|
                            telegram|instagram|tiktok|email), label, value,
                            sort_order
  business_slug_history     id, business_id, old_slug, redirected_at
  business_custom_domains   id, business_id, domain, verification_token,
                            verified_at, ssl_status

New storage bucket: business-gallery (public read, owner write)

New server functions (src/lib/business-bookings.functions.ts,
                     src/lib/business-gallery.functions.ts,
                     src/lib/business-media.functions.ts,
                     src/lib/business-domains.functions.ts)

New routes:
  src/routes/businesses.$slug.book.tsx          (public booking flow)
  src/routes/b.$slug.tsx                        (short vanity URL)
  src/routes/dashboard.businesses_.$id.bookings.tsx
  src/routes/dashboard.businesses_.$id.gallery.tsx
  src/routes/dashboard.businesses_.$id.domain.tsx

Edits:
  /businesses/:slug → add Bookings, Gallery, Videos, Contact-channels
  Edit page → add new tabs
  Subscription / pricing → add custom-domain add-on
  /terms, /privacy → bump for bookings + custom domains
  sitemap.xml → add /b/:slug entries
```

## Suggested rollout order

If you want this to ship in usable chunks rather than one giant push:
1. **Phase 2 (Gallery)** + **Phase 4 (Contact)** — fast wins, 1 batch.
2. **Phase 3 (Video)** — small, slots in next.
3. **Phase 1 (Bookings)** — biggest single feature, ship on its own.
4. **Phase 5a (vanity `/b/:slug`)** — small.
5. **Phase 5b (custom domains)** — last, since it touches DNS/SSL and billing.

Or I do it all in one go if you prefer — just more time before anything lands.

## Decisions I need from you

1. **Rollout**: phased as above, or all-in-one?
2. **Bookings approval mode default**: auto-confirm or manual?
3. **Custom domains pricing**: free for all, or paid add-on (e.g. ₱299/month per domain)?
4. **Vanity URL shape**: `/b/ucatchfuels` (path) or `ucatchfuels.365motorsales.com` (subdomain)? Subdomain feels more pro but needs DNS wildcard on the custom domain.
