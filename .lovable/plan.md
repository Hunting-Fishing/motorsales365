# Business Mini-Sites ("Vendor pages")

Yes — this is very doable, and a strong PH market fit. We already have `/businesses/$slug` with name, logo, cover, photos, hours, location, phone, FB/Messenger link, and a review system. To make it feel like the vendor's *own* professional website (not a directory entry), we'll layer 5 things on top.

## What a vendor mini-site will include

1. **Hero** — cover image + logo + name + tagline + primary CTAs (Call, Message on FB, Get a quote)
2. **About** — rich description, brands carried, service area
3. **Services menu** — e.g. "Basic wash ₱150 · Premium wash ₱350 · Interior detail ₱800" with description + optional photo per service
4. **Products / Mini-shop** — items they sell, with photos, price, and "Message to order" button (no checkout — leads go to FB/Messenger/phone, matching how PH SMBs actually transact)
5. **Gallery** — before/after, work samples (already partly there via `photos`)
6. **Updates / Posts** — short FB-style updates ("Open today till 9pm", "Promo this week") so the vendor has a reason to come back
7. **Reviews** — already exists
8. **Inquiry form** — captures name + phone + message → routed to vendor email + Team Inbox (we already have `dashboard/team/leads`)
9. **Hours + map + directions** — already exists

The vendor gets a clean URL: `365motorsales.com/businesses/manila-auto-spa` and we'll also offer a short share URL + QR (we already have `ShareQr`).

## Plan

### 1. Database (one migration)

New tables, all scoped by `business_id` with RLS so only the owner/org editors can write:

- `business_services` — id, business_id, title, description, price_label, photo_url, sort_order, active
- `business_products` — id, business_id, title, description, price_php, sale_price_php, photo_url, in_stock, sort_order, active
- `business_posts` — id, business_id, body, photo_url, created_at  (short updates feed)
- `business_inquiries` — id, business_id, name, phone, email, message, created_at, status  (lead form submissions; reuses Team Inbox)

Extend `businesses` with: `tagline`, `theme` (jsonb: accent color + font choice), `show_products` / `show_services` / `show_posts` toggles, `cta_primary` ("call" | "messenger" | "inquiry").

RLS: public can SELECT active rows; owner + org members can CRUD.

### 2. Public mini-site routes

- `/businesses/$slug` — keep as the mini-site **homepage** (hero + about + featured services + featured products + latest 3 posts + reviews + map). Major visual upgrade: full-bleed hero, themed accent, vendor-first (less "directory chrome").
- `/businesses/$slug/services` — full services menu
- `/businesses/$slug/shop` — full product grid
- `/businesses/$slug/posts` — all updates
- `/businesses/$slug/contact` — inquiry form (also embedded on home)

Each gets its own `head()` meta + JSON-LD (`LocalBusiness` + `Product` + `Service` schemas) so each vendor gets real Google visibility — a big selling point vs. an FB page.

### 3. Owner editor

Extend `/dashboard/businesses` → add a "Manage page" button per business → new route `/dashboard/businesses/$id/edit` with tabs:

- **Profile** (existing fields + tagline + theme color)
- **Services** (add/edit/reorder/delete)
- **Products** (add/edit/photos/price/sale)
- **Posts** (compose short updates)
- **Inquiries** (leads inbox — reuses Team Inbox pattern)
- **Appearance** (toggle sections, pick accent color)

Mobile-first (most PH SMBs will manage from a phone).

### 4. Lead routing

Inquiry form → insert into `business_inquiries` → email vendor + create a row in the existing `org_leads` table when the business is linked to an organization, so it shows up in the Team Inbox they already have.

### 5. Plan gating (light touch, doesn't block the launch)

- **Free**: profile + 3 services + 3 products + reviews + inquiry form
- **Listed**: unlimited services/products + posts + custom accent color
- **Featured / Premium**: featured placement in directory + analytics + "verified" badge + remove "Powered by 365 Motor Sales" line

This monetizes the new feature without making the free tier feel crippled.

## Technical details

```text
src/routes/
  businesses.$slug.tsx              (mini-site home — rebuilt)
  businesses.$slug.services.tsx     (new)
  businesses.$slug.shop.tsx         (new)
  businesses.$slug.posts.tsx        (new)
  businesses.$slug.contact.tsx      (new)
  dashboard.businesses.$id.edit.tsx (new — tabbed editor)

src/lib/
  business-pages.functions.ts       (serverFns: list/create/update services, products, posts, inquiries)
  business-pages.server.ts          (admin-side helpers)

src/components/business-page/
  hero.tsx
  services-list.tsx
  product-grid.tsx
  posts-feed.tsx
  inquiry-form.tsx
  theme-provider.tsx                (applies vendor's accent color via CSS vars)
```

- Public reads via `supabaseAdmin` in a serverFn (no auth needed) — fast SSR + good SEO.
- Owner writes via `createServerFn` + `requireSupabaseAuth`, checking `owner_id = userId` OR org membership.
- Photo uploads reuse existing `storage-upload.ts` + a new `business-media` bucket.
- Theme color stored as an OKLCH string, injected into a scoped `<div style="--accent: ...">` wrapper — no Tailwind config changes needed.
- JSON-LD: `LocalBusiness` on home, `Service` items, `Product` items, `BreadcrumbList` on sub-pages.

## Rollout suggestion (2 phases)

**Phase 1 (this build)** — DB + public mini-site (hero, services, products, posts, inquiry form, reviews, map) + owner editor. Ship it end-to-end so vendors can fully use it.

**Phase 2 (later)** — Vendor analytics dashboard (views, inquiries, click-to-call counts), custom subdomain support (`manila-auto-spa.365motorsales.com`), WhatsApp/Viber CTAs, scheduled posts, simple booking calendar.

## Questions before I build

1. **Phase 1 scope OK?** Or do you want to trim (e.g. skip Posts in v1) or add (e.g. booking calendar in v1)?
2. **Products** — confirm: no on-site checkout, "Message to order" only (matches PH FB-commerce behavior)? Or do you want Stripe checkout per vendor later?
3. **Free-tier limits** — are 3 services + 3 products on Free reasonable, or do you want unlimited on Free to drive adoption first and gate elsewhere?
