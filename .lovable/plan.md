## Root causes (Lazada short link `s.lazada.com.ph/s.XXX`)

The previous fix assumes Lazada short links use HTTP 30x redirects. They don't — they redirect via **client-side JS / `<meta http-equiv="refresh">`**. So `fetch(..., { redirect: "follow" }).url` returns the short URL itself, Firecrawl scrapes the tiny redirect shim page, and downstream extraction grabs:

1. **Generic brand** — the shim page has no brand, Firecrawl's LLM fills "Generic"/"No Brand".
2. **Wrong price (₱450)** — extractor grabs a voucher/coupon number from the shim, not the real product price (which lives in JSON-LD on the real page).
3. **Empty slug** — importer never fills `form.slug`; admin has to type it.
4. **Generic image** — picks the Lazada favicon / app-banner that survives the icon blocklist.

## Fix

### 1. `src/lib/shop.functions.ts` — robust `resolveFinalUrl`

Replace the current "fetch+follow" with a two-pass resolver:

```ts
async function resolveFinalUrl(input: string): Promise<string> {
  try {
    const res = await fetch(input, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });
    let finalUrl = res.url || input;
    // If HTTP follow didn't move us (JS / meta-refresh shim), inspect body.
    if (finalUrl === input) {
      const body = await res.text();
      finalUrl = extractRedirectFromHtml(body, input) ?? input;
    }
    return finalUrl;
  } catch { return input; }
}

function extractRedirectFromHtml(html: string, base: string): string | null {
  const patterns = [
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"'>\s]+)/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i,
    /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
    /location\.replace\(\s*["']([^"']+)["']/i,
    /"redirectUrl"\s*:\s*"([^"]+)"/i,
    /data-spm-url=["']([^"']+)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) { try { return new URL(m[1].replace(/\\u002F/g, "/"), base).toString(); } catch {} }
  }
  return null;
}
```

Also loop up to **2 hops** (some short links chain `s.lazada → www.lazada/redirect → product`).

### 2. `src/lib/shop.functions.ts` — extraction quality

- **Brand sanitization**: treat `generic`, `no brand`, `no-brand`, `nobrand`, `unbranded`, `oem`, `none`, `n/a` (case-insensitive) as `null`.
- **Price preference order**: JSON-LD `offers.price` → `og:price:amount` / `product:price:amount` → extractor `price`. (Currently extractor wins, which is the noisy source.) Also reject suspiciously low prices when title length suggests a real product (`< 50` AND title has multiple words AND no "voucher/coupon/free" keyword → drop).
- **Image preference order**: JSON-LD `image` → `og:image` → extractor `image_url`. Re-run `looksLikeIconImage` on each. Pull JSON-LD `image` arrays fully and pick the first non-icon entry, not just `[0]`.
- **Canonical URL hardening**: after scrape, if `metadata.ogUrl` / `metadata["og:url"]` / JSON-LD `@id` / `url` is a same-marketplace product page, use *that* as `cleanedUrl` (catches cases where short-link resolver still ends on a redirect page).

### 3. `src/lib/shop-url.ts` — stronger image blocklist

Add Lazada/Shopee CDN icon patterns to `IMAGE_BLOCKLIST`:
```
/_(40|60|64|80|100|120|124|150|200)x\1q?\d*\.(jpg|jpeg|png|webp)/i
/lazada[_-]?logo|lzd-img-global\/.*\/static|app-icon|appdownload|qr[_-]code|banner/i
/static\.lazada\.com\.ph\/static\//i
/shopee\.\w+\/file\/.*_tn/i  // tiny thumbs
```

### 4. `src/routes/admin.shop.tsx` — auto-fill slug

In `importMut.onSuccess`, when slug is empty also set it from the resolved title:

```ts
setForm((f) => {
  const title = f.title || s.title || "";
  return {
    ...f,
    title,
    slug: f.slug || (title ? slugifyClient(title) : ""),
    brand: f.brand || s.brand || "",
    description: f.description || s.description || "",
    image_url: f.image_url || s.image_url || "",
    price_php: f.price_php ?? s.price_php ?? null,
    category_id: f.category_id ?? s.category_id ?? null,
  };
});
```

Add a tiny client `slugifyClient` (`lower → strip non-alnum → collapse → 80 chars`) in the same file (server already has `slugify`).

## Out of scope

Headless-browser scraping beyond Firecrawl's renderer, multi-image gallery import, Storage rehosting, retry/queue of failed imports.

## Files

- `src/lib/shop.functions.ts` — rewrite `resolveFinalUrl` + chain hops, reorder price/image preference, brand sanitizer, canonical URL fallback.
- `src/lib/shop-url.ts` — extend `IMAGE_BLOCKLIST`.
- `src/routes/admin.shop.tsx` — auto-fill `slug` from title on import.
