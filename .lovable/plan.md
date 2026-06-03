## Approach

Several P0/P1 items in the audit are already resolved in the current code (HMAC on `/api/public/payment-events`, build-versioned service worker via `?v=` query, `ops-alerts-digest` token guard, server-side `requireAdminRole*` middleware). The plan therefore has a **verification pass first** so we don't re-fix solved problems, then targeted repair work. Everything stays in-house — no new third-party APIs, no new providers, no new SaaS keys.

Work is split into 5 phases that can ship independently. Each phase ends with a build check.

---

## Phase 0 — Verify "stale" P0 findings (read-only, no edits)

For each P0, confirm current state and either close it out or move it into Phase 1.

| # | Finding | Verification step |
|---|---|---|
| P0-1 | `payment-events` HMAC vs debug-token | Read `payment-events.tsx` + `internal-secrets.server.ts` — confirm `verifyInternalHmac` is the only auth, no `debug-token` branch |
| P0-2 | "Stripe single-tracked through gateway" | Confirmed by design — `stripe-shared-utility` knowledge mandates gateway routing. Close as "intentional, not a vulnerability"; document in `mem://security/stripe-gateway` |
| P0-3 | `as any` count in money paths | Re-count with `rg -c 'as any'` on `webhook.ts` + `payments.functions.ts` — current count is single digits, not 523. Replace remaining ones with proper Stripe SDK types (no behavior change) |
| P0-4 | Client-only admin checks | Audit all destructive admin actions via `rg "effectiveRoles" src/routes/admin* src/components/admin/` — confirm each writes through a `requireAdminRoleAudited` server fn (Phase 2 work added 100%). Mark any survivors for Phase 1 |
| P0-5 | service-role behind debug token | Same as P0-1; closed by HMAC migration |
| P0-6 | SW VERSION never bumped | `public/sw.js` already reads `?v=` from its own script URL — bump strategy is the cache-bust query string set in the registration site. Verify the registrar passes a build hash; if it passes literal `"v1"`, fix in Phase 1 |

Deliverable: a short note in chat listing which P0s are already closed vs. which moved into Phase 1.

---

## Phase 1 — Real P0 fixes (only what Phase 0 surfaces)

In-scope, in-house only:

1. **SW cache-bust** (if Phase 0 finds literal `v1`): update the registrar in `src/main.tsx` / root layout to register `sw.js?v=${import.meta.env.VITE_BUILD_ID ?? Date.now()}` so each deploy busts the cache. No new infra.
2. **Residual `as any` in money paths**: replace with `Stripe.*` types from `stripe@22.0.2`. Pure typing, no runtime change.
3. **Any client-only admin write surface Phase 0 surfaces**: convert to a `createServerFn` gated by `requireAdminRoleAudited(label)`. The middleware + audit log are already in place.
4. **`admin.reports.tsx` swallowed errors**: change hide/remove handlers to check `{ error }` from the supabase call, toast the message, and avoid the optimistic UI flip on failure.
5. **`dashboard.messages.tsx` 500-row pull**: switch to keyset pagination on `created_at` with a "Load more" button, page size 50. No realtime change.

---

## Phase 2 — Routing, SEO & metadata sweep (P1)

Goal: every shareable route has its own `head()` and the site has one source of truth for robots/sitemap.

1. **Resolve robots.txt conflict**: delete `public/robots.txt`, keep `src/routes/api/robots[.]txt.tsx` as the only source, and move it to `/robots.txt` (rename file to `src/routes/robots[.]txt.tsx`). Disallow list aligned to current admin/auth/api paths. Sitemap URL points to `/sitemap.xml`.
2. **Sitemap completeness**: extend `STATIC_ENTRIES` with `/export`, `/tow`, `/partner-training`, `/advertise`, `/my-qr`. Add dynamic blocks for `/passport/*`, `/seller/$slug`, `/r/$code`, `/c/$slug` driven by Supabase `select` queries (mirror each route's loader filters).
3. **Per-route `head()` sweep**: add `head()` to the 46 routes missing it — focus first on public/shareable ones (`/shop`, `/businesses`, `/learn`, `/rides`, `/passport/*`, `/seller/*`, `/map`, `/tow`, `/export`, `/checkout`). Each gets title, description, og:title, og:description, og:url. Admin/dashboard routes get title only + `robots: noindex`.
4. **`og:image` fallback**: at leaf routes with content imagery, derive from loader data. Where none exists, omit (per knowledge rules).
5. **JSON-LD activation**: wire the existing `use-dynamic-jsonld.ts` helper into `/businesses/$slug`, `/shop/$productSlug`, `/learn/$courseSlug`, `/passport/$id` via the route's `scripts` array. Schemas: `Product`, `LocalBusiness`, `Course`, `Person`.
6. **`llms.txt`**: add `public/llms.txt` summarizing the app's domains + key public URLs.
7. **Error/not-found boundaries**: add a shared `RouteError` and `RouteNotFound` component (in `src/components/route-boundaries.tsx`), then attach `errorComponent` + `notFoundComponent` to every route with a loader. Set `defaultErrorComponent` on the router.

---

## Phase 3 — Payments surface cleanup (P1)

In-house only — no new providers wired up.

1. **"Coming soon" rails**: Maya/ShopeePay/InstaPay/PESONet/BPI/BDO/UnionBank stay visible but are gated behind a `feature_flags.payments.<provider>` flag (default off, server-controlled via `site_settings`). Each rail renders a "Coming soon" badge + disabled CTA — no fake checkout path.
2. **Provider extension hook**: extract the Stripe checkout success/fail flow into a `PaymentProvider` interface in `src/lib/payments/provider.ts` so a future in-house provider plugs in without touching call sites. No second provider added in this phase.
3. **Cron URL hardcoding**: replace hardcoded preview/prod URLs in pg_cron migrations with the stable `project--{id}.lovable.app` URL (per public-api-endpoints knowledge), via a new migration that ALTERs existing cron jobs.

---

## Phase 4 — Persistence, accessibility, ops (P1+P2)

1. **localStorage → server**: move currency, feature flags, referral attribution, and simulated roles to `user_preferences` (already exists) for authenticated users; keep localStorage as anonymous fallback only. Simulated roles is dev-only and gets gated behind `import.meta.env.DEV`.
2. **Accessibility pass on `src/components/`**: add `aria-label` to icon-only buttons, `aria-hidden` on decorative icons, and focus-trap (`onKeyDown` Tab/Escape) in `Dialog`/`Sheet`/`Drawer` wrappers. Most shadcn primitives already do this — verify and only patch our custom wrappers.
3. **`alertOps` severity gating**: log `warn` for `info`/`low`, `error` only for `high`/`critical`. Eliminates noise.
4. **PWA manifest**: add `screenshots` (3 entries: home, listings, dashboard) and `shortcuts` (Sell, Search, Inbox) to `public/manifest.webmanifest`.
5. **Legal pages refresh**: re-read `/terms`, `/privacy`, `/refund-policy` against current modules (export brokerage, learning, referrals, org accounts) and append the missing sections. Bump `Last updated` dates. (Memory rule already enforces this for future changes.)
6. **Orphan routes**: link `/my-qr` from dashboard sidebar, `/export` from main nav under "Services", `/partner-training` from `/learn` footer, `/r/$code/poster` from the referral dashboard.

---

## Phase 5 — Tests & guardrails (P2)

1. **Webhook tests**: `src/routes/api/public/payments/webhook.test.ts` with vitest — signature verification (good/bad/expired), idempotent upsert on duplicate events, env query parsing.
2. **Payments unit tests**: round-trip `verifyStripePlans`, `setStripeTaxCodes`, and the price-resolution precedence (`lookup_key` → `lovable_external_id` → `id`).
3. **Smoke test for route boundaries**: render every route file and assert it exports `errorComponent` + (`loader` ⇒ `notFoundComponent`).
4. **CI script** (`scripts/audit-coverage.ts`): grep-based check that fails the build if a new sensitive server fn lands without `requireAdminRoleAudited` / `requireDomainRole`. Runs in `npm test`.

---

## Out of scope (explicit)

- Adding any new payment provider, AI provider, analytics SaaS, or external API.
- Replacing Lovable Cloud / Supabase, the connector gateway, or Cloudflare Workers runtime.
- Migrating from TanStack Start to another framework.
- Editing `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`, or other auto-generated files.

---

## Sequencing & checkpoints

```text
Phase 0  (read-only verify) →  ~10 min, no diffs
Phase 1  (real P0 fixes)    →  small focused PR, build check
Phase 2  (SEO + boundaries) →  largest diff; split into 2 sub-PRs (robots/sitemap/llms first, then per-route head + boundaries)
Phase 3  (payments surface) →  one PR, includes a migration
Phase 4  (a11y + ops + legal) → one PR, mostly UI + content
Phase 5  (tests + CI guard) →  one PR, no runtime changes
```

After each phase the build must pass and `supabase--linter` must stay clean.
