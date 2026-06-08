# Fix Shop Affiliate Import — Missing Prices & Brand

## What's broken (verified in DB + code)

Inspected the last ~20 imported `shop_products`. Symptoms:

- **All 13 Lazada items**: title + image + description came through, but `price_php` and `deal_price_php` are NULL on both `shop_products` and `shop_product_links`. `last_checked_at` IS set → the Lazada scraper *ran* but couldn't parse the price.
- **All 3 AliExpress items**: same as above — and AliExpress has no dedicated scraper, so it falls through to Firecrawl.
- Several rows also have empty `brand` or very short `description`.

Root causes in code:

1. `src/lib/lazada-scraper.server.ts` — `fetchViaPdpHtml` looks for price at `data.skuInfos[skuId].price` / `data.price`. Real Lazada PDPs put it under `skuBase.skus[].price.salePrice`/`originalPrice` and inside `data.bizData`/`productOption`. When the path doesn't match, both `list` and `sale` are `undefined` → price = null. There's also a bug: `sale_price: sale && list && sale < list ? sale : sale` (else branch returns `sale` instead of `undefined`).
2. No AliExpress scraper. `runNetworkScraper` returns `null` for AliExpress; Firecrawl extracts a number but if currency is USD `pickPricePhp` silently returns null.
3. Admin UI has no "re-scrape" action, so fixing existing rows currently means deleting + re-importing each one.

## Fix plan

### 1. Harden `src/lib/lazada-scraper.server.ts`
- In `fetchViaPdpHtml`, extract price from all known shapes:
  - `data.skuBase.skus[matchedSku].price.salePrice` / `originalPrice` / `priceWithTax`
  - `data.skuInfos[skuId].price`
  - `data.bizData.price` / `data.bizData.skuInfo.price`
  - `data.priceModel`
- Add `extractJsonLdFromHtml` as the third fallback (already imported there but only run after the PDP branch already failed).
- Fix the `sale_price` ternary: `sale_price: sale && list && sale < list ? sale : undefined`.
- Add `console.warn` with the itemId + which strategy succeeded/failed so future regressions are visible in `server-function-logs`.

### 2. New `src/lib/aliexpress-scraper.server.ts`
- Same shape as Lazada scraper. Strategy:
  - **A.** PDP HTML fetch → parse `window.runParams.data` (`priceModule.minActivityAmount.value`, `priceModule.maxAmount.value`, `priceModule.formatedActivityPrice`, `titleModule.subject`, `imageModule.imagePathList[0]`).
  - **B.** JSON-LD `Product` offers fallback.
- Currency handling: AliExpress often returns USD/EUR/etc. Convert to PHP using the `currencies` table (`rate_to_php`). If conversion succeeds, return `price` in PHP; if currency is unknown, return the raw number + `currency` so the caller can warn instead of silently dropping it.
- Hook into `runNetworkScraper` in `src/lib/shop.functions.ts` with a `case "aliexpress":` branch.

### 3. Per-row "Re-fetch from source" admin action
- New server fn `rescrapeShopProduct` in `src/lib/shop.functions.ts`:
  - Input: `{ productId: string }`. Auth: `requireDomainRole("shop_manager")`.
  - Loads the product + its primary `shop_product_links` row, re-runs the same scrape pipeline (`runNetworkScraper` → Firecrawl fallback) used by `scrapeShopUrl`.
  - Patches `shop_products` (price, deal_price, is_deal, image_url, description, brand) **only for fields that are currently null/empty or where the source clearly changed**; never overwrites `title` or `slug` (admins may have edited them).
  - Updates the link row's `price_php` / `sale_price_php` / `last_checked_at` and inserts a `shop_price_history` row if price changed.
  - Returns `{ ok, updatedFields: string[], warnings: string[] }` so the UI can flag e.g. "price still missing, please enter manually".
- Add a small "Re-fetch" icon button in the product list row in `src/routes/admin.shop.tsx` (uses `useServerFn`, toast on result). Disable while pending.

### 4. Bulk backfill for the existing 16 rows
- New admin button "Backfill missing prices" in `admin.shop.tsx`. Calls a new server fn `backfillMissingShopPrices` that:
  - Selects shop_products where `price_php IS NULL` AND `active = true` (capped at 50/run).
  - Sequentially runs `rescrapeShopProduct` for each (Lazada/AliExpress get the new scrapers, Firecrawl handles the rest if `FIRECRAWL_API_KEY` is set).
  - Returns aggregate `{ scanned, filledPrice, stillMissing, errors[] }`.
- Self-runs once at deploy time? **No** — left as an explicit admin button so you control timing.

### 5. Surface scraper warnings in admin
- In the existing "Import from URL" form result panel, render any `warnings[]` returned by the scrape (e.g. "Source price was USD; converted at today's FX rate" or "Could not extract price — enter manually").

## Files touched

- `src/lib/lazada-scraper.server.ts` — broaden price extraction, fix sale_price bug.
- `src/lib/aliexpress-scraper.server.ts` — **new**.
- `src/lib/shop.functions.ts` — wire AliExpress into `runNetworkScraper`; add `rescrapeShopProduct` + `backfillMissingShopPrices` server fns; thread `warnings[]` through `scrapeShopUrl` response.
- `src/routes/admin.shop.tsx` — "Re-fetch" row action, "Backfill missing prices" bulk action, render scrape warnings.
- `src/routes/api/public/hooks/refresh-lazada.ts` — no change (already correct; will start succeeding once the scraper extracts prices).

## Out of scope

- No DB schema changes (the columns we need already exist).
- No new affiliate networks beyond AliExpress.
- No change to public-facing `/shop` pages — purely admin + scraper.
- No change to Terms / Privacy (no fee, data-handling, or processor change).

## How you'll verify it worked

After approval & deploy:
1. Open `/admin/shop`, click "Backfill missing prices".
2. Re-run `SELECT title, price_php, deal_price_php FROM shop_products WHERE created_at > now() - interval '2 days' ORDER BY created_at DESC` — the 16 rows should now have prices, or be flagged with a warning shown in the UI for manual entry.
3. Import one new Lazada and one new AliExpress URL via "Import from URL" → confirm price, image, brand all populate on the first try.
