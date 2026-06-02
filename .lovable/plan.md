# Conservative cleanup pass

Goal: tighten the codebase without changing behavior or moving files. Focus on dead code, leftover debug output, and one straggling native dialog. Larger systemic issues (the ~527 `as any` casts, 1000+ line route files) are called out separately so we can tackle them in a later, scoped pass.

## What changes

### 1. Remove dead `private_seller` intent (4 spots)
The signup UI no longer offers a separate "Private seller" card — it's folded into "Buyer & Private Seller". The string `"private_seller"` is unreachable everywhere it still appears.

- `src/components/signup/account-type-grid.tsx` — drop `"private_seller"` from the `SignupIntent` union.
- `src/routes/signup.tsx` — remove the `"private_seller": "/sell"` entry from `POST_SIGNUP_ROUTE`.
- `src/routes/verify-email.tsx` — same removal from the mirrored `POST_ROUTE` map.
- `src/hooks/use-auth.tsx` — remove `"private_seller"` from the pending-signup `intent` union.

### 2. Drop stray `console.log` calls (6 spots, server-side only)
Keep `console.error` / `console.warn`. Remove informational logs that ship to production:

- `src/routes/email/unsubscribe.ts:144`
- `src/routes/lovable/email/suppression.ts:146`
- `src/routes/lovable/email/auth/webhook.ts:119, 206`
- `src/routes/lovable/email/transactional/send.ts:145, 315`

### 3. Replace the last native `window.prompt`
- `src/routes/browse.$category.tsx:184` — the "Name this saved search" prompt becomes a small `SaveSearchDialog` (shadcn `Dialog` + `Input`), matching the pattern of the new `ConfirmDialog`. Same behavior: user types a name, hits Save, search is saved.

### 4. Address the security TODO
- `src/routes/api/public/payment-events.tsx:52` — webhook signature verification is currently a stub comment. Either:
  - **(a)** wire real signature verification if the secret is already configured (preferred), or
  - **(b)** lock the endpoint down (reject all requests with a clear 501) until verification is implemented, so it cannot be abused in production.

  I'll inspect the file and pick whichever is safe given the current secrets/config; default to **(b)** if no secret is wired.

  Note: this is a `/api/public/*` endpoint, so without verification it is reachable from the open internet — fixing this is the highest-impact item in the pass.

### 5. Tiny duplication fix (low-risk, in-place)
- Extract `canNativeShare()` into `src/lib/share.ts` and use it in `src/components/share-qr.tsx` and `src/components/business-page/share-buttons.tsx`. Removes 2 `as any` casts and one duplicated guard. No API change.

## What I'm explicitly NOT doing in this pass

These came up in the audit but don't fit "conservative":

- **The 527 `as any` casts.** Concentrated in server functions where Supabase row types aren't fully inferred (`education.functions.ts`, `business-bookings.functions.ts`, `shop.functions.ts`, etc.). Fixing these properly means typing each query's `.select()` shape — a meaningful refactor per file. Worth a dedicated follow-up pass.
- **21 route files over 400 lines** (largest: `dashboard.businesses_.$id.edit.tsx` at 1,577 lines). Splitting these would change component APIs and import paths — out of scope for conservative.
- **19 files using manual `useState` for submit/loading state** instead of `useServerFn`'s `isPending`. Behavior-preserving but touches a lot of surface area — better as a focused follow-up.
- **Duplicate format helpers** (`formatPHP` vs inline currency formatters). Consolidating is easy but touches many call sites; skipping per conservative scope.
- **2 TODO comments.** The payment-events one is handled in §4; the support.tsx Messenger/WhatsApp link is a content TODO requiring user input (real URLs), not a code cleanup.

## Verification

- `bunx tsc --noEmit` after each group of edits.
- Manual smoke: signup page still renders all three cards, verify-email still routes correctly, save-search dialog opens on browse page.

## Files touched (estimate)

~12 files edited, 1 new file (`src/lib/share.ts`), 0 deletions, 0 moves.
