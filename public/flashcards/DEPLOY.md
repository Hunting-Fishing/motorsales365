# Deploying 365 Flash Cards Training to 365motorsales.com

The game is static files (`game/`) — HTML, CSS, JS, and data. It can be hosted
anywhere that serves static files. Below are the common paths for your site.

## Option A — Host as a standalone page/subdomain (simplest)

Upload the contents of `game/` to a folder or subdomain, e.g.:

- `https://365motorsales.com/training/` → upload `game/*` into `/training/`
- or `https://play.365motorsales.com/` → point the subdomain at the `game/` folder

Then link to it from your main navigation or a product page. Nothing else required.

## Option B — Embed inside an existing page

Host the `game/` folder somewhere reachable, then embed it with an iframe on any
page (including a Shopify page):

```html
<iframe
  src="https://365motorsales.com/training/index.html"
  style="width:100%;height:820px;border:0;border-radius:16px;overflow:hidden"
  title="365 Flash Cards Training"
  loading="lazy"></iframe>
```

## Selling it (your site runs on Shopify)

`365motorsales.com` is a Shopify store, so the cleanest commerce path is:

1. **Create a product** for the game (e.g. "365 Flash Cards Training — Digital Access"). This can be done from the Shopify tools connected here.
2. **Gate access** to the game page after purchase. Options, simplest first:
   - **Customer-account gate:** use a theme/app that locks a page to customers with a specific purchase/tag, and put the game (Option B iframe) on that page.
   - **Digital-product app:** sell access via a digital-products / membership app that reveals a link or page after checkout.
   - **License key:** issue a code on purchase; add a simple unlock check in front of the game (requires a small backend — see below).
3. **Promote** it from the homepage and relevant collections.

> When you're ready, the Shopify connector in this workspace can create the product,
> collection, and a discount code for launch. Just ask.

## When you add accounts & saved progress (later)

The current build keeps all state in memory (no login). To save progress, unlock
by license, or sync across devices, add a small backend (any of: a serverless
function, a lightweight Node/Spring service, or a Shopify app). The game already
isolates data and state cleanly, so adding an API layer is additive — no rewrite.

## Mobile apps (later)

Wrap the same `game/` folder in a WebView shell (e.g. Capacitor) to ship to the
App Store and Google Play from one codebase. The static, dependency-free build is
already mobile-responsive.
