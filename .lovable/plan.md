## Sales area audit + restructure

### Findings (current state)

Sidebar entries visible to `sales` role today: Overview, Accounts, Analytics, Advertising (❌ not granted), Affiliate Shop, Staff QR Referrals, Referral Redemptions, Listings (❌), Audit log (❌), Reports, Service inquiries.

Issues:
- Joan (sales) cannot see `/admin/advertising` — route is gated to `admin` + `advertising` only.
- Promotions/discounts have a DB table (`promotions` — 7 cols, code-based) and `staff_promotions` (personal staff coupons) but **no admin UI** to create/manage either.
- `Reports` page is empty stub.
- `Staff QR Referrals` + `Referral Redemptions` are two clicks for one workflow.
- `Audit log` + `Reports` + `Service inquiries` are three separate "incoming activity" inboxes.
- Role model is flat (`sales`, `admin`, etc.) — no junior/senior/manager distinction, so we can't give Joan more without giving every sales user the same.

### Plan

**1. Tiered staff roles**
- Extend `app_role` enum: add `sales_junior`, `sales_senior`, `sales_manager` (keep legacy `sales` as alias of senior for back-compat).
- Update `useAuth` to expose `salesTier` + helpers `canManageAds`, `canCreatePromotions`, `canIssueDiscounts`.
- Capability matrix:

  ```text
  capability          junior  senior  manager
  view advertising      ✓       ✓       ✓
  manage advertising    —       ✓       ✓
  create promotions     —       ✓       ✓
  issue discounts       —       —       ✓   (also senior with manager approval flag later)
  ```

- Assign Joan `sales_manager` via migration (one-shot for jordilwbailey@gmail.com to set, plus admin UI in `/admin/users` role dropdown).

**2. Advertising access for Joan**
- Add `sales_senior` + `sales_manager` to `roles` array of the `/admin/advertising` nav entry and the route's role gate.
- Server fns under `src/lib/ads.functions.ts`: replace `isAdmin || isAdvertising` checks with a `canManageAds` helper that also accepts the new tiers.

**3. New "Promotions & Discounts" section**
- Route: `src/routes/admin.promotions.tsx` with two tabs:
  - **Promo codes** — CRUD on `public.promotions` (code, % off, applies_to, expiry, active).
  - **Customer discounts** — issue one-off discount to a specific account (writes to existing `account_audit_log` + a new `customer_discounts` table: target user/business, kind, value, reason, expires_at, issued_by).
- Server fns in new `src/lib/promotions.functions.ts` (`listPromotions`, `upsertPromotion`, `deletePromotion`, `issueCustomerDiscount`, `listIssuedDiscounts`) — all gated by `canCreatePromotions` / `canIssueDiscounts`.
- Nav entry gated to `admin`, `sales_senior`, `sales_manager`.

**4. Sidebar merges**
- **Referrals** (new `/admin/referrals` shell with tabs):
  - Tab "Staff QR codes" → existing `/admin/referrals` content.
  - Tab "Redemptions" → existing `/admin/redemptions` content.
  - Keep old URLs as redirects.
- **Activity** (new `/admin/activity` shell with tabs):
  - "Reports" · "Service inquiries" · "Audit log".
  - Old URLs redirect into the matching tab via search param `?tab=`.
- Remove the three old top-level entries, replace with two consolidated entries.

**5. Audit doc**
- Write `docs/SALES_AUDIT.md` summarizing the findings above, the new role matrix, and the migration map (old route → new tab) so the team has a single reference.

### Files

**Create**
- `src/routes/admin.promotions.tsx`
- `src/routes/admin.referrals.index.tsx` (tabbed shell — replaces current `admin.referrals.tsx` flat page)
- `src/routes/admin.activity.tsx` (tabbed shell)
- `src/lib/promotions.functions.ts`
- `src/hooks/use-auth.tsx` additions (helpers)
- `docs/SALES_AUDIT.md`
- Migration: enum extension + `customer_discounts` table (+ GRANTs + RLS + `has_sales_tier` SQL helper) + Joan role grant.

**Edit**
- `src/routes/admin.tsx` (NAV array: add promotions, replace referral pair + activity trio, update role gates).
- `src/routes/admin.advertising.tsx` (role gate).
- `src/lib/ads.functions.ts` (auth checks → `canManageAds`).
- `src/components/admin/*` any role checks referencing `isSales`/`isAdvertising`.

### Technical notes

- Tier helpers derive from `user_roles` rows; manager implies senior implies junior for permission checks (computed in `useAuth`, plus a `has_sales_tier(_user_id, _min_tier)` SQL function for RLS).
- `customer_discounts` RLS: insert/select for `sales_manager` + `admin`; target user can SELECT their own.
- All new server fns use `requireSupabaseAuth` + tier check; admin-elevated writes (e.g. issuing discount on someone else's account) go through `supabaseAdmin` after the tier check passes.
- Old route files become 1-line `<Navigate>` shims so existing bookmarks keep working.
