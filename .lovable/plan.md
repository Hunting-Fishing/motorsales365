# Phase 3 — Payments surface + Phase 4 — a11y / legal / state

## Phase 3 — Payments surface (in-house, no new SaaS)

### 3.1 Provider abstraction
Create `src/lib/payments/provider.ts`:
- `PaymentProvider` discriminated-union type: `"stripe" | "paymongo" | "xendit"`.
- `PaymentRail` interface — `{ id, label, enabled, supports: { oneTime, subscription, boost } }`.
- `getEnabledRails()` reads from feature flags (3.2) and returns enabled list.
- Default registry has Stripe `enabled: true`; PayMongo + Xendit registered but `enabled: false` (rail metadata only — no SDKs imported).
- This is a typed seam; existing checkout code keeps calling Stripe directly. Future in-house providers plug in by adding a `.functions.ts` file and flipping the flag.

### 3.2 Feature-flag table (in-house, no external service)
New migration adds `public.feature_flags`:
- columns: `key text PK`, `enabled bool default false`, `payload jsonb default '{}'`, `updated_at timestamptz`
- GRANT select to `anon, authenticated`; full to `service_role`
- RLS: SELECT public-readable (flag state isn't a secret); INSERT/UPDATE/DELETE admin-only via `has_role(auth.uid(), 'admin')`
- Seed rows: `payments.stripe=true`, `payments.paymongo=false`, `payments.xendit=false`, `boost.escrow=false`, `subscriptions.annual=true`
- New `getFeatureFlags()` server fn (cached 60s) + `useFeatureFlag(key)` hook.

### 3.3 Checkout UI surface
- `src/components/checkout/payment-rails.tsx`: lists rails from `getEnabledRails()`, renders disabled ones with "Coming soon" pill behind a `showComingSoon` prop (default false).
- No behavior change to current Stripe flow.

### 3.4 Cron URL audit (close-out)
- Verify the two cron migrations already use the stable `project--{id}.lovable.app` pattern (they do).
- Add a code comment in `src/routes/api/public/fx/refresh.tsx` and `hooks/refresh-lazada.ts` documenting the cron contract so future edits don't break the schedule.

### 3.5 Admin flags UI
- New `src/routes/admin.feature-flags.tsx` (noindex) — list flags, toggle enabled, edit `payload` JSON. Gated by `requireAdminRoleAudited("flags.toggle")`.
- Add nav entry under admin layout.

---

## Phase 4 — a11y / legal / state

### 4.1 localStorage → server (selective)
Migrate ONLY values that should sync across devices:
- **Currency preference** → `profiles.preferred_currency` column. Hook reads from server when logged in, falls back to localStorage anonymous.
- **Simulated roles** (admin "act as" testing) → keep localStorage, dev-only, gated by `import.meta.env.DEV`.
- **Feature-flag overrides** (dev) → stay localStorage, dev-only.
- **Referral attribution** → stay localStorage (anonymous, expires after 30 days). Document why.

Migration: add `preferred_currency text` to `profiles` with check constraint.

### 4.2 Accessibility pass on `src/components/`
- Add `aria-label` to all icon-only buttons (`Button size="icon"` without text).
- Add `aria-hidden="true"` to decorative lucide icons inside labeled buttons.
- For clickable `<div>` / `<span>` patterns: convert to `<button>` OR add `role="button" tabIndex={0} onKeyDown` for Enter/Space.
- Scope: `src/components/site-header.tsx`, `site-layout.tsx`, `ui/` shadcn primitives are already a11y-correct; focus on custom components (`checkout/`, `admin/`, `dashboard/`).

### 4.3 Legal pages refresh
Per memory: changing fees/payments/boosts/refunds/business directory/services + data handling requires `/terms` + `/privacy` + `/refund-policy` updates. The newer modules added since last review:
- **Export brokerage** — add section to `/terms` (broker role, fees, dispute scope) and `/privacy` (export buyer data sharing).
- **Learning / partner training** — add to `/terms` (course refunds, partner attribution) and `/refund-policy`.
- **Referrals / organization accounts** — add to `/terms` (org admin responsibility) and `/privacy` (org-level data visibility).
- Bump "Last updated" on all three pages.

### 4.4 PWA manifest screenshots
- Skip unless user explicitly wants generated screenshots — placeholder PNGs are worse than none.

---

## Out of scope (deferred to Phase 5)
- E2E / webhook / payments unit tests
- CI `scripts/audit-coverage.ts`
- Removing the last `as any` in non-money paths

## Scope guarantees
- No new external APIs, providers, or SaaS — provider seam is empty scaffolding
- No edits to auto-generated files (`routeTree.gen.ts`, `types.ts`, `client.ts`)
- All admin writes gated by `requireAdminRoleAudited`
- Legal page updates bump dates per memory rule

Approve to start with 3.1 → 3.5, then move to 4.1 → 4.3.
## Phase 4 — done (2026-06-03)

- Added `profiles.display_currency text` column via migration.
- `src/lib/currency.functions.ts`: `getMyDisplayCurrency` / `setMyDisplayCurrency` server fns (RLS-scoped).
- `src/lib/currency.tsx`: sync local `mref_currency` with profile on sign-in / change; localStorage retained as anon/SSR fast-path.
- Legal pages refreshed: terms (new §18A export brokerage, learning, referrals, org accounts), privacy (new §13b), refund-policy. "Last updated" bumped to June 3, 2026.
- a11y pass: aria-label + aria-hidden on icon-only buttons in single-file-uploader, gallery-contact-tabs (album edit/delete, contact remove), business hours-editor, admin add-user-dialog.
- Skipped per scope: simulated roles & dev feature-flag overrides stay localStorage; PWA screenshots; E2E/webhook tests.
