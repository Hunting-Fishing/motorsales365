## Goal
Add Playwright e2e tests that fail if the referral page's QR card, referral-link card, or promoter resource cards overlap (or overflow the viewport) at 360, 390, and 414 CSS px widths.

## Scope
- One new spec: `e2e/referral-mobile-layout.spec.ts`.
- Reuses the existing sandbox Supabase session pattern (same as `e2e/qr-responsive.spec.ts`), skipping with a warning if `LOVABLE_BROWSER_AUTH_STATUS !== "injected"`.
- No app code changes. No new helpers beyond this spec file. No visual/pixel-diff.

## What the test asserts (per viewport: 360, 390, 414)

For the route `/dashboard/referral`, after login + `networkidle`:

1. **No horizontal page overflow** — `document.documentElement.scrollWidth <= viewport.width`.
2. **QR canvas fits** — the `<canvas>` inside the QR card has `getBoundingClientRect().right <= viewport.width` and `width === height` (square).
3. **Referral-link card fits** — the card containing `<code>` with the referral URL has `right <= viewport.width` and its inner `<code>` element is not wider than its parent (no horizontal clip beyond `truncate`).
4. **No overlap between the three regions**, tested pairwise using `DOMRect` intersection on:
   - QR card (the QR `<button>` wrapper)
   - Referral-link card (the card with the copy button)
   - Each promoter resource `<a>` card in the `/dashboard/promoter-resources`, `/resources/qr-landing`, `/dashboard/qr-ads`, `/dashboard/qr-scan-test` grid
   Rects overlap iff `r1.left < r2.right && r2.left < r1.right && r1.top < r2.bottom && r2.top < r1.bottom`. Fail with a message naming both elements and their rects.
5. **Promoter resource cards don't overflow** — every card's `right <= viewport.width`.

## Element selection strategy
- QR card: `[data-qr]` (already on `ResponsiveQr`) → `.closest('button')`.
- Referral-link card: locate by the visible label text "Your referral link", then its enclosing `.rounded-xl` card.
- Promoter cards: the section immediately following the QR/stats section — select the four `<a>` elements by their headings ("Promoter resources", "Preview scanner view", "QR Ads & print", "Test QR scanability").

## Failure output
On failure, print: viewport width, offending selector(s), each rect (`x,y,w,h`), and save a screenshot to `e2e/__screenshots__/mobile/referral-<width>.png` (folder already gitignored via `e2e/.gitignore`).

## Out of scope
- Tablet/desktop viewports.
- Other dashboard pages (covered by separate mobile-audit plan if approved later).
- CI wiring, pixel snapshots, accessibility checks.

## Run
`bunx playwright test e2e/referral-mobile-layout.spec.ts --project=mobile` (uses the existing `mobile` project in `playwright.config.ts` if present; otherwise the spec calls `page.setViewportSize()` per test so the default project works too).
