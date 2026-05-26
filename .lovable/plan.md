# Finalize remaining security findings

The latest scan returned 46 items. Most of the 39 Supabase-linter warnings are already documented as intentional in `docs/SECURITY.md` (8 helper RPCs + `increment_listing_view` + `ad_inquiries` `INSERT (true)`). The remainder are **real** issues that need code/migration fixes.

## Real fixes (migration + code)

### 1. `listing_boosts` — leaking `user_id` / `payment_id` (ERROR)
Replace public `SELECT USING (true)` with:
- Public sees only: a thin view `public.listing_active_boosts(listing_id, product_slug, starts_at, ends_at)` filtered to `now() between starts_at and ends_at`, `security_invoker = on`, granted to `anon`/`authenticated`.
- Table policy: owner (`auth.uid() = user_id`) and admin/sales (`is_staff`) only.
- Update `src/components/boost-dialog.tsx` and any listing-card boost badge to read from the new view.

### 2. `advertisements` — exposes `advertiser_email` / `advertiser_name` (ERROR)
- Drop the broad "Anyone can view active ads" policy.
- Add `public.active_ads_public` view (security_invoker) selecting only the columns the carousel actually needs (id, placement, image_url, headline, cta_url, etc. — **no** advertiser_email/name/phone).
- Repoint `src/components/ads/ad-carousel.tsx` and `src/lib/ads.functions.ts` public reads at the view. Admin reads stay on the table via `can_manage_ads`.

### 3. Shop admin functions missing `can_manage_shop` (ERROR — 8 functions)
In `src/lib/shop.functions.ts`, add the same guard already used by `adminUpsertProduct` to:
`adminListNetworks`, `adminUpsertNetwork`, `adminUpsertLink`, `adminDeleteLink`, `adminProductLinks`, `adminListFitment`, `adminUpsertFitment`, `adminDeleteFitment`.

```ts
const { data: ok } = await supabase.rpc("can_manage_shop", { _user_id: userId });
if (!ok) throw new Error("Forbidden");
```

Also tighten RLS on `affiliate_networks`, `shop_product_links`, `shop_product_fitment`: writes restricted to `can_manage_shop(auth.uid())`; reads stay public where the feature needs it.

### 4. Open redirect on Stripe `returnUrl` (4 functions)
Add a shared `validateReturnUrl()` helper in `src/lib/stripe.server.ts` with an allowlist:
`https://365motorsales.com`, `https://www.365motorsales.com`, `https://motorsales365.lovable.app`, plus current preview origin from `process.env`.
Call it inside `.inputValidator()` of:
- `createCheckoutSession` (`src/utils/payments.functions.ts`)
- `createPortalSession` (same file)
- `createBoostCheckout` (`src/lib/boosts.functions.ts`)
- `createBusinessSubscriptionCheckout` (`src/lib/business-subscriptions.functions.ts`)

Throw on mismatch; clients already pass `window.location.origin`-based URLs so no UI change needed.

### 5. `businesses` / `organizations` — public phone/email (WARN)
Create `public.businesses_public` and `public.organizations_public` views that omit `email`, `phone`, raw `address_line` (keep city/region/coords for the map). Repoint public reads (`businesses.index.tsx`, `business-map`, public org pages) at the views. Authenticated detail pages can still read contact fields via the existing inquiry/lead flow, which already gates by RLS.

### 6. `listing_views` — confirm no direct insert path
Already correct: there is **no** INSERT policy, and writes happen exclusively through `increment_listing_view()` (SECURITY DEFINER). Add an explicit `REVOKE INSERT ON public.listing_views FROM anon, authenticated` to document intent + silence the scanner re-check.

## Findings to ignore (already documented)

Mark these as `ignore` via `security--manage_security_finding` with the rationale already living in `docs/SECURITY.md`, and refresh `security--update_memory` so future scans don't re-flag them:

- 8× `SUPA_authenticated_security_definer_function_executable` for `has_role`, `is_staff`, `can_moderate`, `can_support`, `can_manage_ads`, `can_manage_shop`, `current_plan_tier`, `is_business_account`, `increment_listing_view` (needed by RLS policies — see SECURITY.md §1/§3).
- 1× `SUPA_anon_security_definer_function_executable` for `increment_listing_view` (anonymous page-view tracking — SECURITY.md §2).
- 1× `SUPA_rls_policy_always_true` on `ad_inquiries` "Anyone can submit ad inquiry" (lead-capture form, validated by trigger — SECURITY.md "Accepted RLS warnings").

The other 5 `RLS Policy Always True` warnings will be investigated during the migration; if any covers a real INSERT/UPDATE/DELETE on user data it gets fixed (not ignored). Likely candidates are other public-form inserts (`service_inquiries`, `tow_requests` requester self-insert, `staff_referral_audit` trigger inserts). Each will either be tightened to `WITH CHECK (auth.uid() = <owner_col>)` or — if it's a truly anonymous form like `ad_inquiries` — kept and ignored with the same trigger-validated rationale.

The 2 `Public Bucket Allows Listing` warnings will be resolved by re-checking the storage policies added in the last hardening migration; if any bucket still has a wildcard `SELECT` policy on `storage.objects`, replace it with a per-object policy (`name = <expected>` or owner-scoped).

## Deliverables

1. One migration containing: 2 new views, RLS rewrites on `listing_boosts`/`advertisements`/`businesses`/`organizations`/shop tables, explicit REVOKE on `listing_views`, storage policy fixes if any remain.
2. Code edits: 8 shop functions, 4 Stripe functions, plus repoint reads to the new views (ad-carousel, businesses index, listings boost badge).
3. `security--manage_security_finding` batch to ignore the documented noise.
4. `security--update_memory` updated with the new accepted-risk list.
5. Re-run `security--run_security_scan` — target: 0 errors, only the documented accepted warnings remain.

## What this does NOT touch

- Stripe live-mode go-live (still requires user action in dashboard).
- Email queue/auth-hook infra (already verified working).
- Functional changes to listings, leads, dashboards, or passports.
