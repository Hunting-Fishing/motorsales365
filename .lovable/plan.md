## Problem

`https://s.lazada.com.ph/s.ZUvcYu?c=a` is a **short redirect link**, not the actual product page. The current `scrapeShopUrl` passes it straight to Firecrawl, which scrapes the tiny intermediary HTML — so the JSON extractor gets nothing (no title, brand, price, description, category) and grabs the generic Lazada "favorite" heart GIF as the image.

The same problem applies to `vt.tiktok.com`, `vm.tiktok.com`, `amzn.to`, `amzn.asia`, `s.shopee.*`, etc.

## Fix

Resolve the URL **before** scraping, then improve extraction quality.

### 1. `src/lib/shop-url.ts` — short-link detection

Add `isShortLink(url)` returning true for known short hosts:
- `s.lazada.*`, `c.lazada.*`
- `s.shopee.*`, `shp.ee`
- `vt.tiktok.com`, `vm.tiktok.com`
- `amzn.to`, `amzn.asia`, `a.co`
- `s.click.aliexpress.com`, `a.aliexpress.com`

### 2. `src/lib/shop.functions.ts` — `scrapeShopUrl` handler

**a. Resolve redirects server-side** before calling Firecrawl:
```ts
async function resolveFinalUrl(input: string): Promise<string> {
  try {
    const res = await fetch(input, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; 365MotorSalesBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    return res.url || input;
  } catch { return input; }
}
```
If `isShortLink(data.url)` → resolve, then re-run `cleanShopUrl` + `detectNetworkSlug` against the resolved URL. Use the resolved URL as the scrape target and as the saved canonical URL.

**b. Harden Firecrawl call**:
- Add `waitFor: 2500` so SPA marketplaces (Lazada/Shopee/TikTok) finish rendering.
- Add `location: { country: "PH", languages: ["en"] }` for PH pricing.
- Expand schema prompt: "Extract real product fields. Ignore navigation, recommendation rails, 'you may also like', and site-wide UI."
- Add `og:title` / `og:description` / `ogImage` / `og:price:amount` to the metadata fallback chain.

**c. Image quality filter**:
Reject obvious icon/UI images: any image-url whose path matches `/124-124\.|favicon|heart|wishlist|placeholder` or is from a non-CDN host. Prefer the `og:image` when the extracted `image_url` is rejected.

**d. JSON-LD `Product` fallback**:
When the JSON extractor returns null for title/price/brand, parse the scraped `html` (request `rawHtml` format too) for `<script type="application/ld+json">` blocks, pick the first `@type: "Product"` (or graph node), and read `name`, `brand.name`, `description`, `image[0]`, `offers.price`, `offers.priceCurrency`.

**e. Return the resolved canonical URL** in `cleanedUrl` so the auto-link save uses the real product URL, not the short link.

### 3. UI feedback (`src/routes/admin.shop.tsx`)

Surface what got resolved/filled so the user understands:
- After fetch, also display the resolved URL in the helper line: `Resolved → {cleanedUrl}` when it differs from the pasted URL.
- Keep current "auto-filled empty fields" behavior unchanged.

## Files

- `src/lib/shop-url.ts` — add `isShortLink` + image-icon blocklist helper
- `src/lib/shop.functions.ts` — add `resolveFinalUrl`, JSON-LD fallback, image filter, `waitFor`, `location`, rawHtml format
- `src/routes/admin.shop.tsx` — show resolved-URL hint after fetch

## Out of scope

- Bulk import, scheduled re-scrape, image rehosting to Storage, headless-browser scraping beyond Firecrawl's built-in render.
