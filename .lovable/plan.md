
# 365motorsales Launch-Readiness Plan

Goal: ship every item from the full-app audit in the correct order — security first, correctness second, SEO/a11y/polish last — so the next publish is genuinely launch-grade.

Work is grouped into 4 phases. Each phase is independently shippable; do not start a phase before the prior one is green.

---

## Phase 1 — P0 Security & Correctness Blockers

Nothing else ships until these are done.

### 1.1 Harden `/api/public/payment-events`
- Remove `PAYMENT_WEBHOOK_ENABLED` gate.
- Replace `x-debug-token` check with provider-specific HMAC verification:
  - `stripe-signature` (already handled in `/payments/webhook` — share verifier helper).
  - `paymongo-signature` (SHA256 HMAC over raw body, `t=…,te=…,li=…`).
  - `x-callback-token` (Xendit) — constant-time compare against `XENDIT_CALLBACK_TOKEN`.
- Route on a `?provider=stripe|paymongo|xendit` query param; reject unknown providers with 400.
- Read raw body **once** (`await request.text()`) before parsing — required for HMAC.
- Keep service-role usage but only after signature passes.
- Add `PAYMONGO_WEBHOOK_SECRET` and `XENDIT_CALLBACK_TOKEN` via `add_secret`.

### 1.2 Server-side admin guard
- Add `requireAdminRole` middleware in `src/integrations/supabase/admin-middleware.ts` that chains `requireSupabaseAuth` then calls `has_role(userId,'admin')` via service-role client; throws 403 otherwise.
- Apply to every destructive admin server fn: `admin-users.functions.ts`, `admin.reports.tsx` mutations, `business-pages.functions.ts` admin paths, `education.functions.ts` admin paths, `ads.functions.ts`, `referrals` admin, `pricing` admin, currencies, redemptions, type-suggestions, verifications.
- Keep client `effectiveRoles` for UX hiding only.

### 1.3 Stripe gateway resilience
- Wrap `createStripeClient`'s fetch with a 2-attempt retry on 5xx / network error, exponential backoff (250ms, 1s), max 1 retry on POSTs without idempotency key.
- Surface `alertOps('stripe.gateway_unreachable', …, { severity:'critical' })` after final failure.
- Document in `docs/STRIPE_GOLIVE.md` that gateway is single-tracked by design.

### 1.4 Service worker version stamping
- Replace hardcoded `VERSION = "v1"` in `public/sw.js` with a build-time replacement (`__SW_VERSION__`) injected by a tiny Vite plugin reading `package.json` version + git short SHA.
- On activate, `caches.keys()` → delete any cache not matching current version.

### 1.5 Type-safety sweep on money paths
- Eliminate `as any` in: `src/utils/payments.functions.ts`, `src/routes/api/public/payments/webhook.ts`, `src/lib/listing-payment.functions.ts`, `src/lib/boosts.functions.ts`, `src/lib/business-subscriptions.functions.ts`.
- Use generated Supabase types + `Stripe.*` types directly; introduce narrow Zod schemas for webhook payloads.
- Target: 0 `as any` in those 5 files (rest of codebase can wait).

**Phase 1 verification:** all migrations applied, secrets confirmed via `fetch_secrets`, test webhook from Stripe CLI + PayMongo sandbox + Xendit sandbox each return 200 with valid sig and 401 without, admin server fn returns 403 when called by non-admin.

---

## Phase 2 — P1 SEO, Error Handling, Accessibility

### 2.1 Per-route `head()` sweep (46 missing routes)
Build a shared `buildPageHead({title,description,path,image?,type?})` helper in `src/lib/seo/head.ts` that returns the `{meta,links}` shape with title, description, og:title/description/url/type, twitter card, and canonical `https://365motorsales.com${path}`.

Add `head()` to every public/shareable route currently missing one:
- `/` (home), `/shop`, `/shop.categories`, `/shop.$category`, `/shop.brand.$slug`, `/shop.department.$slug`, `/shop.p.$slug`
- `/businesses`, `/businesses.$slug.book`, `/businesses.submit`
- `/rides`, `/rides.$slug`, `/map`, `/tow`, `/export`, `/advertise`, `/partner-training`
- `/learn`, `/learn.$slug`, `/learn_.$slug.watch.$lessonId`
- `/passport.$slug`, `/seller.$id`, `/sell`, `/sell.import`, `/my-qr`
- `/payments`, `/pricing`, `/checkout.return`, `/listing.checkout`, `/boost.checkout`, `/business.checkout`, `/payments.$id.receipt`
- `/support*`, `/about`, `/contact`, `/guidelines`, `/affiliate-disclosure`
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/unsubscribe`
- All dashboard routes get title only + `noindex` meta.
- All admin routes get title + `noindex,nofollow`.

Dynamic routes (`listing.$id`, `b.$slug`, `businesses.$slug`, `rides.$slug`, `shop.p.$slug`, `passport.$slug`, `learn.$slug`) derive title/desc/og:image from `loaderData`. Pull cover image from existing listing/product/business data — no placeholder images.

### 2.2 JSON-LD wiring
Use existing `use-dynamic-jsonld.ts` (or inline via `head().scripts`) on:
- `listing.$id` → `Vehicle` + `Offer` + `BreadcrumbList`
- `businesses.$slug` → `LocalBusiness` + `AggregateRating` (when reviews exist)
- `shop.p.$slug` → `Product` + `Offer`
- `learn.$slug` → `Course`
- `learn_.$slug.watch.$lessonId` → `VideoObject` when `video_url` present
- `__root.tsx` keeps existing `Organization` + `WebSite` (already good)
- FAQ routes (support pages) → `FAQPage`

### 2.3 Consolidate robots.txt + sitemap
- Delete `public/robots.txt`. Keep only dynamic `src/routes/api/robots[.]txt.tsx`.
- Update dynamic robots: single canonical host `https://365motorsales.com`, `Sitemap: https://365motorsales.com/sitemap.xml`, disallow `/admin`, `/dashboard`, `/api/`, `/auth/*`, `/unsubscribe`, `/checkout.return`.
- Expand `src/routes/sitemap[.]xml.ts` to include: `/export`, `/tow`, `/partner-training`, `/advertise`, `/my-qr`, all `/passport/$slug` (from DB), `/seller/$id` (from DB), `/r/$code` public referral landing pages, `/c/$code` campaign pages.
- Add `public/llms.txt` describing the site for AI crawlers (site purpose, key sections, sitemap URL).

### 2.4 Error/NotFound boundaries on every route
- Add `errorComponent: RouteErrorBoundary` and `notFoundComponent: RouteNotFoundBoundary` (both already in `src/components/route-boundaries.tsx`) to every `createFileRoute` that has a `loader`.
- Set `defaultErrorComponent` on the router in `src/router.tsx`.

### 2.5 Ops alert digest auth
- Add `apikey` query/header check on `/api/public/hooks/ops-alerts-digest` matching new `OPS_DIGEST_CRON_KEY` secret. Update pg_cron migration to pass it.
- Same treatment for `/api/public/hooks/refresh-lazada` and `/api/public/fx/refresh` (audit).
- Make pg_cron job URLs read from a `site_settings.app_url` row instead of hardcoded preview URL; update migration that originally created jobs.

### 2.6 Data correctness fixes
- `admin.reports.tsx`: handle Supabase error responses on hide/remove, surface toast on failure.
- `dashboard.messages.tsx`: paginate at 50/page with cursor on `created_at`.
- `alertOps`: only `console.error` for `error`/`critical`; `console.warn` for `warning`; `console.info` for `info`.

### 2.7 Payments UI cleanup
- Either wire Maya + QR Ph via Stripe PH `payment_method_types` (5-min toggle), or move them into the same "On the roadmap" accordion the planned methods live in. No "Coming soon" copy outside that accordion.
- Remove ShopeePay/InstaPay/PESONet/BPI/BDO/UnionBank cards from above-fold entirely until a real rail exists.

**Phase 2 verification:** run `seo_chat--trigger_scan`, fix findings, mark resolved; manual smoke of 10 routes confirms unique titles/descriptions; sitemap validates; broken loader on `listing.$id` shows boundary not blank.

---

## Phase 3 — P2 Accessibility & Polish

### 3.1 Accessibility pass
- Audit every icon-only button in `src/components/` (header, mobile-tab-bar, listing-card actions, share/qr buttons, admin tables). Add `aria-label` to button + `aria-hidden="true"` to inner `<Icon/>`.
- Add `role="dialog"` + focus trap to Dialog/Sheet/Drawer wrappers (shadcn provides primitives; wire `aria-modal`, initial focus, `onKeyDown` Esc).
- Add visible focus ring tokens in `src/styles.css` (`--ring`) where missing.
- Ensure form labels associate with inputs via `htmlFor`/`id` everywhere (`signup`, `sell`, `dashboard.profile`, `dashboard.businesses_.$id.edit`).

### 3.2 PWA polish
- Add `shortcuts` (Sell, Browse rides, Shop, My garage) and `screenshots` (1 mobile + 1 desktop, generated) to `public/manifest.webmanifest`.
- Verify all icon sizes render correctly on iOS install (apple-touch 180×180 confirmed) and Android (192/512/maskable confirmed).

### 3.3 Legal pages re-review
- Update `/terms` to cover: organizations/teams, export brokerage, learning/courses, referrals, shop affiliate disclosure.
- Bump "Last updated" on `/terms`, `/privacy`, `/refund-policy`.
- Cross-check against `mem://policies/terms-sync` and `mem://policies/privacy-sync` rules.

### 3.4 Orphan routes
- Either link from nav (footer + mobile tab) or `noindex`: `/my-qr`, `/export`, `/partner-training`, `/r/$code/poster`. Recommendation: footer link `/export`, `/partner-training`; keep `/my-qr` + `/r/$code/poster` `noindex` (utility pages).

### 3.5 Minimum test coverage
- Add Vitest smoke tests for: HMAC verifier (Stripe, PayMongo, Xendit each — happy + bad sig), `requireAdminRole` (admin → ok, non-admin → 403), `receipt-lines` (already exists), `buildPageHead`, currency formatter.
- Add one Playwright E2E: `signup → verify → list a vehicle → checkout sandbox card → success`. Stored in `tests/e2e/`.

---

## Phase 4 — Live Switch

### 4.1 Stripe go-live (out of code, owned by user)
Follow `docs/STRIPE_GOLIVE.md` steps 1–5. No code change. Test-mode banner auto-clears.

### 4.2 Pre-publish verification
- Run `cloud_status`; require `ACTIVE_HEALTHY`.
- Run `supabase--linter`; resolve any new findings.
- Run security scan; update `security--update_memory`.
- Run dependency scan.
- Bump instance size (Cloud → Overview → Advanced).
- Trigger SEO rescan; confirm 0 failing.
- Verify canonical domain resolves to apex `https://365motorsales.com` on 10 sample routes.

### 4.3 Publish
Publish from Lovable. Smoke test live Stripe checkout end-to-end with a real card and immediately refund.

---

## Technical Notes

- All new server endpoints under `/api/public/*` must verify signature/apikey BEFORE touching the DB.
- All new server functions that mutate must use either `requireSupabaseAuth` (user-scoped) or `requireAdminRole` (admin-scoped). No exceptions.
- `head()` helper centralises canonical generation so changing the apex domain is one-line.
- SW version is build-time-stamped — no human intervention needed per release.
- Migrations: one for `site_settings.app_url`, one to rewrite pg_cron jobs to read that value and pass `apikey`.
- New secrets needed: `PAYMONGO_WEBHOOK_SECRET`, `XENDIT_CALLBACK_TOKEN`, `OPS_DIGEST_CRON_KEY`.

---

## Order of operations (single timeline)

1. Secrets added (`PAYMONGO_WEBHOOK_SECRET`, `XENDIT_CALLBACK_TOKEN`, `OPS_DIGEST_CRON_KEY`).
2. Phase 1.1 → 1.2 → 1.3 → 1.4 → 1.5.
3. Phase 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7.
4. Phase 3.1 → 3.2 → 3.3 → 3.4 → 3.5.
5. Phase 4 (user-driven Stripe go-live + publish).

Estimated agent build time end-to-end: Phase 1 ~1 build, Phase 2 ~2 builds (head sweep is large), Phase 3 ~1 build, Phase 4 = user action + verification.
