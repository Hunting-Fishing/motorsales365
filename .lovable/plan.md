## Goal
Extend the clean (no-watermark) background to the checkout routes so they match the shop pages and avoid watermark bleed-through on payment/content surfaces.

## Change
In `src/components/site-layout.tsx`, broaden the `cleanBg` matcher so it covers checkout flows in addition to `/shop`:

- `/shop/*` (already covered)
- `/boost/checkout`
- `/business/checkout`
- `/listing/checkout`
- `/checkout/return`

Implementation: update the `cleanBg` boolean to also match `pathname.startsWith("/checkout")` and any path ending in `/checkout` (i.e. `/boost/checkout`, `/business/checkout`, `/listing/checkout`).

```ts
const cleanBg =
  pathname.startsWith("/shop") ||
  pathname.startsWith("/checkout") ||
  /\/checkout(\/|$)/.test(pathname);
```

No other files change. No business logic, routing, or styling tokens are touched — only the conditional class on `<main>`.

## Verification
- Visit each checkout route in the preview and confirm a solid `bg-background` with no watermark bleed.
- Confirm non-shop, non-checkout pages still render the `brand-watermark` background unchanged.
