## Goal

Deepen parts monetization across four tracks. Phase the work so each piece ships independently.

## 1. Universal "Shop parts" widget on every vehicle page

- `AffiliatePartsSection` already renders on `listing.$id` for all categories except towing/services.
- Add it to `rides.$slug.tsx` (community ride pages — same `make/model/year` context).
- Add a compact variant to listing cards' detail modal where applicable.
- No schema changes.

## 2. `/parts/search` — VIN / Year-Make-Model multi-merchant fan-out

New public route `src/routes/parts.search.tsx`:

- Top form: VIN input (calls existing `decodeVin`), OR Year/Make/Model dropdowns, OR free-text part query.
- Optional JDM chassis code lookup (uses existing `jdm_chassis_codes`).
- Result section reuses `AffiliateShopRow` with the resolved query, plus a grid of merchant cards (Amazon, eBay, AliExpress PH, Shopee PH, Lazada PH) each opened via `/api/public/go/<slug>` so clicks are tracked.
- SEO: head() with VIN/MMY in title for shareable URLs (`?vin=…` or `?mk=…&md=…&yr=…`).

## 3. Approved-partner storefronts (B2B retail)

Schema additions:

```text
parts_supplier_applications
  + storefront_slug TEXT UNIQUE (nullable)
  + storefront_published BOOLEAN DEFAULT false
  + storefront_blurb TEXT
  + storefront_logo_url TEXT
  + storefront_categories TEXT[]
```

- Admin "Partner applications" tab: when status set to `approved`, prompt for a slug + publish toggle.
- New public route `src/routes/shop.$slug.tsx`: hero with logo/blurb, categories chips, a primary "Visit shop" CTA routed through `/api/public/go/partner-<slug>` (creates a per-partner tracked outbound), plus contact form that pipes into existing `part_quote_requests`.
- New `affiliate_links` row pattern `partner-<slug>` so click logging reuses the existing pipeline.

## 4. Click + conversion analytics dashboard

New admin route `src/routes/admin.parts.analytics.tsx`:

- Reads `affiliate_clicks` aggregates: by merchant, by day (7/30d), by listing, by make/model.
- Top earners table + CSV export.
- Empty "Conversions" panel with a stub showing where postback data will appear once webhooks are wired (deferred per your answer).

Server fn `getAffiliateAnalytics` in `src/lib/affiliate-analytics.functions.ts`, admin-gated via `requireSupabaseAuth` + `has_role('admin')`.

## Order of execution

1. Migration (storefront columns on `parts_supplier_applications`, `partner-*` row pattern docs).
2. `/parts/search` route + add widget to `rides.$slug`.
3. Storefront publish flow in admin + public `/shop/:slug`.
4. Analytics dashboard + CSV export.

## Notes

- No new secrets. Postback wiring deferred until you enable a network console.
- Everything reuses existing `affiliate_links` + `affiliate_clicks` tables and the `/api/public/go/$slug` redirect.
- All public routes get loader-fed `head()` tags for OG share.
