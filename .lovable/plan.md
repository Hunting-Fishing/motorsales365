
## Goal

In **Admin → Shop → New/Edit Product**, add a URL-import flow: paste any marketplace link (Shopee, Lazada, TikTok Shop, Amazon, Carousell, AliExpress, etc.), click **Fetch**, and the dialog auto-populates **title, brand, description, image, price, suggested category** — plus the canonical affiliate link is pre-staged for the Links tab. Detected network is matched against your `affiliate_networks` table so the click-through tag is applied later by `/go/$productId`.

## UX

In `ProductDialog` (admin.shop.tsx), add a section at the top of the form:

```text
┌─ Import from URL ─────────────────────────────────────┐
│ [ https://shopee.ph/...  paste link        ] [Fetch] │
│ Detected: Shopee PH · Network linked ✅               │
│ ⓘ Fields below were pre-filled — review before save.  │
└───────────────────────────────────────────────────────┘
```

Behavior:
- Empty fields are filled. Already-filled fields are **not overwritten** unless the user clicks a small "Replace" badge next to each scraped value.
- Image preview shows the scraped `og:image` before saving.
- On save, if a network was detected, the cleaned URL is also auto-inserted as a `shop_product_link` row for that network (via existing `adminUpsertLink`) so the admin doesn't have to re-paste it under the Links dialog.
- Fetch button shows a spinner and a toast on error (rate-limited, blocked, no metadata found).

## Server side

New server function `scrapeShopUrl` in `src/lib/shop.functions.ts` (admin-only, behind `requireSupabaseAuth` + `assertShopManager`):

1. Validate input URL (zod, `https?://`, max 2000 chars).
2. `cleanShopUrl(url)` (existing util) to strip tracking junk.
3. `detectNetworkSlug(url)` to identify the marketplace; look up matching row in `affiliate_networks` for the response.
4. Call **Firecrawl** (`@mendable/firecrawl-js`, `FIRECRAWL_API_KEY` from env) using `scrape` with formats `['markdown', 'summary', { type: 'json', schema }]` where `schema` describes:
   ```ts
   { title, brand, description, price, currency, image_url, category_hint }
   ```
   Firecrawl's LLM extraction handles each marketplace's varied HTML/JSON-LD without per-site parsers. Fallback: read `metadata.title`, `metadata.description`, `metadata.ogImage` if JSON extraction returns nothing.
5. Map `category_hint` to an existing `shop_categories` row by fuzzy slug/name match (server-side).
6. Return:
   ```ts
   {
     cleanedUrl, networkSlug, networkId | null,
     suggested: { title, brand, description, image_url, price_php, currency, category_id | null },
     raw: { sourceUrl, scrapedAt }
   }
   ```

Errors return `{ error: string, suggested: null }` so the UI can show a toast without crashing.

## Connector requirement

This needs the **Firecrawl** connector (gateway-enabled) so `FIRECRAWL_API_KEY` is injected at runtime. If it isn't linked yet, I'll prompt you to connect it before shipping — no code change needed from you, just one click.

If you'd rather not use Firecrawl, the fallback is a much weaker "fetch HTML + parse `<meta og:*>` + JSON-LD `Product`" implementation in pure server code — works on Amazon/Shopify but unreliable on Shopee/Lazada/TikTok because they render client-side. Recommendation: Firecrawl.

## Files touched

- `src/lib/shop.functions.ts` — add `scrapeShopUrl` server fn + small helpers (fuzzy category match).
- `src/routes/admin.shop.tsx` — `ProductDialog`: add Import-from-URL row, fetch handler, pre-fill logic, and on-save side effect to upsert the affiliate link when a network was detected.
- No DB migration. No changes to public shop pages.

## Out of scope (ask if you want)

- Bulk import (paste many URLs at once).
- Re-scrape on a schedule to refresh price/stock.
- Image rehosting to Supabase Storage (we'd just store the marketplace `og:image` URL).
