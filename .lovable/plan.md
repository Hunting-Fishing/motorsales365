## Scope
Wrap up the `/franchise` plan by adding discovery links, policy updates, paid membership fees, and a public directory of approved partners.

## 1. Cross-linking & discovery

- **Footer** (`src/components/site-footer.tsx`): already links to `/franchise`; add "Franchise status" (auth-only) and "Our Partners" (`/franchise/partners`) links.
- **User avatar menu** (site header dropdown): when the signed-in user has any `franchise_applications` row OR active `franchise_memberships`, add a "Franchise status" item linking to `/_authenticated/franchise/status` (or `/dashboard` when approved). Uses a lightweight `useFranchisePresence` hook backed by a new `getMyFranchisePresence` server fn.
- **`/advertise` page**: add a callout card near the pricing/CTA area — "Bigger discounts as a 365 Partner" with tier fee + ad discount pulled from `franchise_tiers`, linking to `/franchise`.
- **Admin sidebar**: confirm the Franchise group (Applications, Tiers) exists; add "Members" once directory is live.

## 2. Terms & Privacy sync (core memory rule)

- **`/terms`**: add "Franchise & Partner Program" section covering tier fees (monthly + setup), obligations, discount code misuse, termination, refund policy pointer, and membership fee non-refundability after activation. Bump "Last updated".
- **`/privacy`**: add "Shared CRM & partner network" section describing what customer data is shared with an approved partner shop (name, contact, vehicle, service history relevant to the partner), user opt-out, retention on membership termination. Bump "Last updated".

## 3. Membership payments (seamless Stripe)

Fee collection on approval — previously v2, now included.

- **Stripe products**: one product per active tier, priced from `franchise_tiers.monthly_fee_cents` (recurring monthly). Setup fee = one-time price on the same product. Product IDs: `franchise_tier_<slug>` / prices `franchise_<slug>_monthly`, `franchise_<slug>_setup`. Admin tier editor writes to the DB; a small "Sync to Stripe" action calls a server fn that upserts product + prices via the shared Stripe utility.
- **Approval flow**: `adminDecideApplication` with `approve` now creates a `franchise_memberships` row in `status='pending_payment'` and stores `pending_tier_slug` + generated `member_number`. Applicant sees a "Complete membership" CTA on `/_authenticated/franchise/status` opening embedded Stripe checkout for setup fee + subscription (single session, `mode: subscription` with one-time line item).
- **Webhook**: extend existing Stripe webhook to handle `checkout.session.completed` for franchise sessions (identified by `metadata.franchise_membership_id`) → flip membership to `active`, set `started_at`, `renews_at`, and `stripe_customer_id`/`stripe_subscription_id`. Handle `customer.subscription.updated/deleted` to update `status` (`active`/`past_due`/`cancelled`).
- **Portal**: reuse `createPortalSession` for franchise subscribers.
- **DB migration**: `franchise_memberships` gets `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `pending_tier_slug`, plus `pending_payment` in status enum. `franchise_tiers` gets `stripe_product_id`, `stripe_monthly_price_id`, `stripe_setup_price_id`, `stripe_synced_at`. Grants + RLS updated.
- **Dashboard**: `MembershipCard` shows next renewal date + "Manage billing" (portal).

## 4. Public partner directory

- **Route**: `src/routes/franchise.partners.tsx` (public, SSR, own `head()` with title/description/og).
- **Data**: new server fn `listPublicPartners()` (publishable-key client) returning approved memberships with tier badge, business slug, city/province, cover photo — filtered to `status='active'` AND business is published/verified. Add narrow `TO anon` SELECT policy scoped to active memberships joined via a `partner_directory` view (or a security-definer function) so we don't expose raw membership rows.
- **UI**: filter chips (Tier: Partner / Franchise; Province). Cards link to the business page. Empty state: "We're onboarding our first partners — apply to be listed."
- **Cross-links**: `/franchise` hero gains "See our partners" secondary CTA when directory is non-empty; footer link added above.

## 5. Verification

- Playwright: `/franchise/partners` renders (empty + seeded), avatar-menu status entry appears after applying, `/advertise` shows partner callout, `/terms` and `/privacy` show new sections.
- Manual: admin approves an application → applicant checks out via Stripe test card `4242…` → webhook flips membership active → directory lists the new partner.
- Confirm RLS: anon can read only the public partner view; applicants can't see others' memberships; admin sees all.

## Files (high level)

- Migration: `franchise_memberships` cols + enum, `franchise_tiers` Stripe cols, `partner_directory` view + policy.
- `src/lib/franchise.functions.ts`: add presence, public partners, admin tier sync-to-stripe, membership checkout session, portal wrapper.
- `src/routes/franchise.partners.tsx` (new).
- `src/routes/franchise.tsx`, `src/routes/advertise*.tsx`, `src/components/site-footer.tsx`, header user menu component.
- `src/routes/_authenticated/franchise.status.tsx` + new `MembershipCheckoutCard` component.
- `src/routes/_authenticated/franchise.dashboard.tsx`: renewal + portal.
- `src/routes/admin.franchise-tiers.tsx`: "Sync to Stripe" button.
- Stripe webhook route: franchise event branch.
- `src/routes/terms.tsx`, `src/routes/privacy.tsx`: new sections + updated dates.

## Order of execution

1. Migration (Stripe columns + enum + partner_directory view).
2. Server fns (presence, partners, tier sync, checkout, webhook branch).
3. UI: partner directory, cross-links, dashboard/status updates.
4. Terms & Privacy sync.
5. Playwright verification.

## Out of scope

- Automatic tax handling beyond Stripe defaults (revisit once first live partner).
- Payout/commission tracking (belongs to `/partner-program`, not franchise).
- Public partner profile beyond linking to their existing business page.
