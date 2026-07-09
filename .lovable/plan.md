## Goal
Launch `/franchise` as the on-ramp for shops to join the 365 network — either as a lightweight **365 Partner** (keep own brand, trust badge + benefits) or a full **365 Franchise** (operate under 365 brand, deeper integration). Public marketing + application intake, admin review queue, approved-partner dashboard, and admin-editable tier configuration.

## Pages & routes

- `src/routes/franchise.tsx` — public pitch page (SSR, own `head()` meta).
  - Hero: "Join the 365 network" with two-tier switcher (Partner / Franchise).
  - Benefits grid (4 pillars): Parts pricing & network stock · Shared customer CRM · Marketing & trust boost · Software suite included.
  - Tier comparison table (fees, parts discount %, ad discount %, software access, branding rights) — pulled from `franchise_tiers` table so admin edits are live.
  - "How it works" 4-step (Apply → Review → Onboard → Launch).
  - Social proof / NAPA-style positioning strip.
  - FAQ (accordion).
  - Sticky "Apply now" CTA → `/franchise/apply`.
- `src/routes/franchise.apply.tsx` — public application form (works signed-out; prompts sign-in on submit if needed).
- `src/routes/_authenticated/franchise/status.tsx` — applicant sees their submission status + messages.
- `src/routes/_authenticated/franchise/dashboard.tsx` — approved partners: tier badge, parts discount, network stock link, shared-CRM link, Shop Manager quick-open, ad-discount code.
- `src/routes/_authenticated/admin/franchise.tsx` — admin queue: pending/approved/rejected tabs, review drawer with notes, approve/reject/request-info, tier assignment.
- `src/routes/_authenticated/admin/franchise-tiers.tsx` — admin CRUD for tier config.

## Data model (new tables)

1. `franchise_tiers` — admin-editable tier catalog.
   - `slug` (unique: `partner` | `franchise` | future), `name`, `tagline`, `monthly_fee_cents`, `setup_fee_cents`, `parts_discount_bps`, `ad_discount_bps`, `includes_shop_manager` (bool), `includes_inventory` (bool), `includes_shared_crm` (bool), `branding_rights` (text), `features` (jsonb array of bullets), `is_active`, `sort_order`.
   - Public SELECT for `is_active`; admin write.

2. `franchise_applications` — intake + review workflow.
   - `user_id` (nullable — allow signed-out submit), `contact_name`, `contact_email`, `contact_phone`, `business_name`, `business_id` (nullable FK to `businesses`), `city`, `province`, `tier_slug` (requested), `shop_type`, `years_in_business`, `staff_count`, `monthly_parts_spend_cents`, `existing_brands` (text[]), `website_url`, `notes`, `status` (`pending`|`in_review`|`info_requested`|`approved`|`rejected`), `assigned_tier_slug` (nullable, admin sets on approve), `reviewer_id`, `reviewer_notes`, `decided_at`.
   - Policies: insert public (rate-limit via existing patterns), owner SELECT own by `user_id` or `contact_email` match; admin full access.

3. `franchise_memberships` — approved partners.
   - `user_id`, `business_id`, `tier_slug`, `member_number` (auto), `status` (`active`|`suspended`|`cancelled`), `started_at`, `renews_at`, `ad_discount_code` (text).
   - Owner SELECT own; admin full access.

4. `franchise_application_messages` — thread between applicant and reviewer.
   - `application_id`, `sender_id`, `body`, `is_internal` (bool, admin-only visibility).

All tables: full GRANT block per house rules, RLS on, `updated_at` trigger, timestamps.

## Server functions (`src/lib/franchise.functions.ts`)

- `listActiveTiers()` — public, publishable-key client.
- `getTierBySlug(slug)` — public.
- `submitFranchiseApplication(payload)` — public (no auth required); Zod-validated; attaches `user_id` when signed in.
- `getMyApplication()` — auth; returns applicant's latest app + messages.
- `postApplicationMessage({ applicationId, body })` — auth (applicant or admin).
- `getMyMembership()` — auth; returns active membership + tier.
- Admin (`ensureAdmin` gate):
  - `adminListApplications({ status?, search?, limit })`
  - `adminGetApplication(id)` (with internal messages)
  - `adminDecideApplication({ id, decision: approve|reject|request_info, assigned_tier_slug?, reviewer_notes? })` — on approve, creates `franchise_memberships` row + generates `ad_discount_code`, notifies applicant.
  - `adminListTiers()` / `adminUpsertTier(payload)` / `adminDeleteTier(id)`

## Components

- `src/components/franchise/tier-switcher.tsx` — segmented control Partner ↔ Franchise driving the hero + benefits copy.
- `src/components/franchise/benefits-grid.tsx` — 4 pillars, icon + copy per tier.
- `src/components/franchise/tier-compare-table.tsx` — data-driven table.
- `src/components/franchise/how-it-works.tsx`.
- `src/components/franchise/franchise-faq.tsx`.
- `src/components/franchise/apply-form.tsx` — Zod-validated multi-step-lite form.
- `src/components/franchise/application-status-card.tsx`.
- `src/components/franchise/membership-card.tsx` — tier badge, discount %, ad code, quick links to Shop Manager + Stock Network.
- `src/components/admin/franchise/applications-queue.tsx`, `application-review-drawer.tsx`, `tier-editor.tsx`.

## Cross-linking & discovery

- Add "Become a 365 Partner" link in the main footer and inside the shop-manager pricing/marketing area.
- Add card on `/advertise` linking to franchise ("Bigger discounts as a 365 Partner").
- Add nav entry under user avatar → "Franchise status" once an application exists.
- Admin sidebar: new "Franchise" group with Applications + Tiers.

## Design

Reuse existing 365 tokens (no new palette). Hero uses gradient-primary + existing card styles. Tier switcher = `Tabs` primitive. Comparison table = shadcn `Table`. Icons via `lucide-react` (Handshake, PackageCheck, Users, Megaphone, LayoutDashboard).

## SEO

Route `head()`:
- title: "365 Franchise & Partner Program — Grow your shop with the 365 network"
- description: "Join the 365 network as a Partner or Franchise. Get parts discounts, shared customer CRM, network stock visibility, marketing boost, and bundled Shop Manager tools."
- og:title / og:description matching; og:image at leaf only (skip until we have a real cover).

## Policy sync

Per core memory, franchise fees, discounts, memberships, and data handling touch commerce + data. In the same batch as the migration/UI:
- Update `/terms` with a new "Franchise & Partner Program" section (fee cadence, tier obligations, termination, discount misuse) and bump "Last updated".
- Update `/privacy` for the shared-CRM data flow (what's shared with partner shops, opt-out, retention) and bump "Last updated".

## Out of scope for v1

- Payment collection for membership fees (surface fee, collect via existing Stripe flow later).
- Real-time cross-shop inventory sync UI (link to future stock-network route as "coming soon" for now).
- Public partner directory page (add later once ≥5 approved).

## Verification

- Playwright: load `/franchise` mobile + desktop, submit application as signed-out user, sign in, view status page. Admin approves → verify membership row + dashboard renders.
- Confirm RLS: anon cannot read `franchise_applications`; applicant cannot read others'; admin sees all.
- Confirm GRANTs present on all four new tables.
