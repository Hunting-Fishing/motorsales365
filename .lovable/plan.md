## Goal

Fix the regression where pasting an affiliate URL (e.g. Lazada short link) populates the form with junk or empty fields, and give the admin a way to manually pick which marketplace the URL belongs to so the right scraper path runs.

## Problems observed

From the screenshot: a Lazada short link resolves correctly, but the form ends up with placeholder title/brand/description, an `s.alicdn.com` (AliExpress CDN) image, and no price. Reading `src/lib/shop.functions.ts` `scrapeShopUrl`:

1. **Wrong result silently wins.** `fetchLazadaProductData` calls Lazada's `mtop.gsearch` search endpoint by item id. When it returns a non-matching item (different itemId, even from a different marketplace's CDN), the function still returns it as `marketplace`, and the code then does `apiKey && !marketplace` → Firecrawl is skipped. The bad search hit becomes the answer.
2. **No id verification.** The "find by itemId" lookup falls back to `items[0]` when no exact match — that's how an unrelated product (with an alicdn image) slips through.
3. **No way to override.** If detection picks the wrong network, or Lazada's API path fails for a working Shopee/Amazon URL, the admin has no escape hatch — they have to clear fields manually.

## Changes

### 1. `src/lib/shop.functions.ts` — harden `scrapeShopUrl`

- Accept an optional `networkSlug` input (`shopee | lazada | tiktok | amazon | aliexpress | carousell | ebay | zalora`). When provided, it overrides `detectNetworkSlug` and selects which per-network helper to try.
- In `fetchLazadaProductData`:
  - Drop the `items[0]` fallback. Only return a match when `String(row.itemId) === ids.itemId` (and skuId matches when present). Otherwise return `null`.
  - Reject results whose image host is not `*.lzcdn.com` / `*.slatic.net` / `*.alicdn.com`-with-lazada-path — i.e. if the image clearly belongs to another marketplace, treat it as no result.
  - Wrap the whole call in a single try/catch that returns `null` on any parse error (already partly there, tighten it).
- Change the dispatch logic to: `marketplace = await runNetworkScraper(networkSlug, cleanedUrl)`, where `runNetworkScraper` is a thin switch with a slot per network. Today only `lazada` has a custom path; the others fall through to Firecrawl. This makes it trivial to add Shopee/Amazon-specific paths later without touching the orchestrator.
- Always run Firecrawl when `marketplace` is `null` AND `apiKey` is set, regardless of detected slug. Merge: marketplace wins only field-by-field when it actually has a value (`pickStr` already does this).
- When the user explicitly forces a `networkSlug`, skip `detectNetworkSlug`'s host check and pass the slug straight through to the link-staging step so the affiliate link still gets attached to the right network row.

### 2. `src/routes/admin.shop.tsx` — network selector in the import panel

In `ProductDialog`'s "Import from affiliate URL" block:

- Add a small `Select` next to the URL input: "Auto-detect" (default) + one option per active row from `adminListNetworks()`. Reuse the existing `useQuery(["admin-networks"])` pattern from `LinksDialog`.
- Pass the chosen slug to `scrapeShopUrl({ data: { url, networkSlug } })`.
- After fetch, if `importInfo.networkSlug` differs from the manual choice, show a one-line warning ("URL host looks like X but you selected Y — link will be saved under Y").
- Keep the existing auto-fill behaviour (don't overwrite user-edited fields).

### 3. No DB or schema changes

`affiliate_networks` already has the slug column; we just read it. No migration needed.

## Out of scope (phase 2)

- Writing Shopee / Amazon / AliExpress custom scrapers. The selector lets you pick the network now; we'll add per-network extractors as separate steps once we see which sites Firecrawl handles poorly.
- Changing how the scraper handles Lazada region detection beyond `.ph/.sg/.my/...` (already in `extractLazadaIds`).

## Verification

- Paste the Lazada short link from the screenshot with "Auto-detect" → expect either real fields or a clean Firecrawl fallback (no alicdn image).
- Paste the same link with network forced to "lazada" → same.
- Paste a Shopee product URL with "Auto-detect" → Firecrawl path runs, fields populate, link auto-staged under shopee network.
- Paste a Lazada URL with network forced to "shopee" → fields populate via Firecrawl, link saved under shopee (warning shown about mismatch).
