# Shop Manager portal — Phase 1

## Reality check before we start

The source project **All Business 365** is huge: ~200 pages, 100+ component folders, 663 migrations, and 20+ verticals (automotive, marine, septic, fuel, welding, etc.). It also lives on its **own Supabase** (`oudkbrnvommbvtuispla`) — two Lovable projects cannot share one Supabase, so "same database" isn't on the table.

Phase 1 therefore ships a **portal**: this site sells the subscription, writes an entitlement row into the All Business 365 DB, and SSOs the user into the existing deployment (`mainrepairsoftware.lovable.app`). Phases 2+ port the automotive module's tables and screens into this codebase, behind the same subscription gate, so over time users stop being redirected.

## Phase 1 deliverable (this turn)

### 1. Pricing + landing
- New public route `/shop-manager` — value prop, screenshots, plan cards.
- New Stripe product **Shop Manager** with prices `shop_manager_solo_monthly` and `shop_manager_pro_monthly` (created via the payments tool; amounts/currency confirmed with you before creation).
- Reuses the existing embedded checkout flow (`StripeEmbeddedCheckout`) — no new payment plumbing.

### 2. Subscription record + gate (this DB)
- New table `public.shop_manager_subscriptions` (user_id, tier, status, current_period_end, stripe_subscription_id, external_account_id, sso_provisioned_at). RLS: user reads own row; service_role full.
- Hook `useShopManagerAccess()` → reads the row, exposes `{ active, tier }`.
- Stripe webhook handler (in our existing webhook route) upserts the row on `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted`.

### 3. Provisioning into the All Business 365 DB
- New secrets (added via secrets tool, you paste the values):
  - `SHOP_MANAGER_SUPABASE_URL` = `https://oudkbrnvommbvtuispla.supabase.co`
  - `SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY` (you'll generate this in the other project)
  - `SHOP_MANAGER_SSO_SECRET` (random 32-byte hex — used to sign the SSO handoff)
- Server fn `provisionShopManagerAccount` (called from the webhook after a successful subscription):
  - Creates / looks up an `auth.users` row in the All Business 365 DB by the buyer's email (via Auth Admin API on that project).
  - Inserts/updates a row in a new table on **that** DB: `external_entitlements (user_id, source='365motorsales', tier, expires_at, signature)`. Migration for that one row lives in the All Business 365 project (separate task; I'll ship the SQL file ready to paste).
  - Stamps `external_account_id` and `sso_provisioned_at` back on our local row.

### 4. SSO handoff
- Server route `/api/public/shop-manager/sso` (POST, requires our auth):
  - Verifies the caller has an active `shop_manager_subscriptions` row.
  - Mints a short-lived (60s) HMAC-signed JWT with `{ email, tier, exp, nonce }` using `SHOP_MANAGER_SSO_SECRET`.
  - Returns `{ redirect_url }` = `https://mainrepairsoftware.lovable.app/sso/365motorsales?token=…`.
- Client side: an "Open Shop Manager" button on `/shop-manager` and on the dashboard sidebar calls that fn and `window.location.href`s into it.
- On the All Business 365 side (separate, documented in `docs/shop-manager-sso.md`): a `/sso/365motorsales` route verifies the HMAC + nonce, then signs the user in via Auth Admin's `generateLink` magic-link flow. I'll include that as a ready-to-paste handler in the doc — not modifying that project from here.

### 5. Dashboard surface
- New card in `/dashboard` sidebar: "Shop Manager" with status pill (Active / Inactive). Links to `/shop-manager` if inactive, opens SSO if active.
- "Subscriptions" tab on dashboard already exists — add Shop Manager line with manage/cancel link.

### 6. Compliance copy
- Bump `/terms` (adds Shop Manager subscription + third-party data handoff clause).
- Bump `/privacy` (discloses that email + display name are forwarded to All Business 365 on activation).
- Bump `/refund-policy` (Shop Manager is monthly, cancel anytime, no proration).

## Technical details

### New files
- `src/routes/shop-manager.tsx` — public landing + pricing + checkout trigger.
- `src/routes/_authenticated/shop-manager-gate.tsx` — post-purchase success → "Open Shop Manager" CTA.
- `src/routes/api/public/shop-manager/sso.ts` — TanStack server route (TOKEN MINTING; requires our cookie/JWT, not public despite path).
- `src/lib/shop-manager.functions.ts` — `getShopManagerAccess`, `provisionShopManagerAccount`, `requestShopManagerSsoUrl`.
- `src/lib/shop-manager-sso.server.ts` — HMAC sign helper (server-only).
- `src/hooks/use-shop-manager-access.ts`.
- `src/components/shop-manager/plan-card.tsx`, `open-shop-manager-button.tsx`.
- `docs/shop-manager-sso.md` — partner-side integration steps (SQL + receiver handler to paste into All Business 365).

### Edited files
- `src/routes/_authenticated/dashboard.tsx` (or current dashboard route) — add Shop Manager card.
- Stripe webhook handler (whichever file currently handles `checkout.session.completed`) — branch on the Shop Manager product to call `provisionShopManagerAccount`.
- `src/components/site-header.tsx` — add "Shop Manager" nav entry.
- `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/routes/refund-policy.tsx` — policy updates + bump "Last updated".

### Migration (this project only)
```sql
CREATE TABLE public.shop_manager_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('solo','pro')),
  status text NOT NULL DEFAULT 'inactive',
  stripe_subscription_id text UNIQUE,
  external_account_id text,
  sso_provisioned_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_manager_subscriptions TO authenticated;
GRANT ALL    ON public.shop_manager_subscriptions TO service_role;
ALTER TABLE public.shop_manager_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row read" ON public.shop_manager_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
```

### Phases 2+ (NOT this turn — preview only)
- Phase 2: port `automotive/` pages + `work_orders`, `repair_plans`, `vehicle_inspections`, `parts_tracking`, `customers` schemas into this DB. Mount at `/shop-manager/*` behind the same gate. Subscription flips from "redirect SSO" to "local app".
- Phase 3: connect Shop Manager work orders ↔ this site's `listings`, `parts_wanted`, `service_inquiries`, `businesses` (already in place).
- Phase 4: migrate existing All Business 365 customer data via export → import script; retire SSO redirect.

## Open questions before I build
1. **Prices**: what should `shop_manager_solo_monthly` and `shop_manager_pro_monthly` cost (PHP and/or USD)? Feature split between tiers?
2. You'll need to (a) generate a service-role key in the All Business 365 project and (b) paste a tiny SQL migration + an SSO receiver route there. Confirm you can do that, or I'll script-export both files for you to drop in.
3. Should Phase 1 require a verified Business on this site, or is any signed-in user allowed to subscribe?
