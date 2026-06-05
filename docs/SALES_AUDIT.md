# Sales Console Audit — June 2026

## Findings

- Joan (sales role) could not see `/admin/advertising` — route was gated to `admin` + `advertising` only.
- Promotions/discounts had DB tables (`promotions`, `staff_promotions`) but **no admin UI** to create or manage either.
- `Reports`, `Service inquiries`, and `Audit log` were three separate sidebar entries for what is essentially one "incoming activity" inbox.
- `Staff QR Referrals` + `Referral Redemptions` were two clicks for one workflow.
- Role model was flat (`sales`, `admin`, etc.) — no junior/senior/manager distinction.

## New tiered sales roles

The `app_role` enum is extended with three tiers. Legacy `sales` continues to work and is treated as `sales_senior`.

| Capability                  | junior | senior | manager | admin |
|-----------------------------|:------:|:------:|:-------:|:-----:|
| View Advertising dashboard  |   R    |   ✓    |    ✓    |   ✓   |
| Manage Advertising / ads    |        |   ✓    |    ✓    |   ✓   |
| Create / manage promotions  |        |   ✓    |    ✓    |   ✓   |
| Issue customer discounts    |        |        |    ✓    |   ✓   |
| Referrals (QR + redemptions)|   ✓    |   ✓    |    ✓    |   ✓   |
| Activity (reports/inq/audit)|   ✓    |   ✓    |    ✓    |   ✓   |

R = read-only. Capability flags live in `useAuth`: `canManageAds`, `canCreatePromotions`, `canIssueDiscounts`.

Joan (`jordilwbailey@gmail.com`) is upgraded to `sales_manager`.

## Sidebar restructure

| Before                                    | After                                          |
|-------------------------------------------|------------------------------------------------|
| Staff QR Referrals + Referral Redemptions | **Referrals** (tabs at top: QR codes / Redemptions) |
| Reports + Service inquiries + Audit log   | **Activity** (tabs: Reports / Inquiries / Audit) |
| —                                         | **Promotions & Discounts** (new)               |
| Advertising (admin/advertising only)      | Advertising (also sales senior+)               |

Old routes (`/admin/redemptions`, `/admin/inquiries`, `/admin/audit`) are kept intact so existing links and bookmarks continue to work; they just render with the new tab strip on top.

## Migration map

- `supabase/migrations/20260605033802_…sql` — adds `sales_junior` / `sales_senior` / `sales_manager` to `app_role`, `has_sales_tier()` SQL helper.
- `supabase/migrations/20260605033831_…sql` — creates `customer_discounts` table + RLS, upgrades Joan to `sales_manager`.
- `src/hooks/use-auth.tsx` — exposes `salesTier`, `canManageAds`, `canCreatePromotions`, `canIssueDiscounts`.
- `src/lib/promotions.functions.ts` — server functions for promo CRUD and discount issuance.
- `src/routes/admin.promotions.tsx` — new UI with two tabs (Promo codes / Customer discounts).
- `src/components/admin/admin-group-tabs.tsx` — shared tab strip used by Referrals & Activity groups.

## Follow-ups (not in this pass)

- Per-row visibility in Activity for support staff (today they see all reports/audit; junior sales sees same).
- Dedicated "Audit log" filter for promotion/discount issuance once volume warrants it.
- Manager approval flow for discounts above a configurable threshold.
