# Partner / Advertising Hub — consolidation plan

Right now partner/advertising users have to hop across seven scattered routes (My leads, My referrals, Performance, Advertisements, QR analytics, Activity & reports, QR leads), some of which live under `/dashboard/team/*` and others under `/admin/*`. On top of that, "My leads" (Inbox) crashes because `/dashboard/team/leads` requires an `orgId` search param and the hamburger link doesn't pass one — that's the "Something went wrong" screen and `orgId invalid_type` error you're seeing.

This plan pulls everything under one roof, merges the pieces that overlap, and adds a first-run experience.

## New unified route

Create **`/dashboard/partner`** as the single "Partner & Advertising" hub with a persistent tab bar (same visual style as `/admin/advertisements`). Only tabs the user has access to are shown.

```text
/dashboard/partner
├── overview        (Home — first-time guided cards + shortcuts)
├── inbox           (unified leads: sales leads + QR leads, tabbed by source)
├── referrals       (My referrals + share links + QR)
├── qr-ads          (personal QR templates — moved from admin)
├── qr-analytics    (scans / signups / redemptions)
├── advertisements  (campaigns/promotions — admin/advertising only)
├── performance     (sales performance + commissions)
└── activity        (activity & reports — admin/support only)
```

Old routes stay as redirects to their new tab so bookmarks keep working.

## What gets merged

| Old label | Was at | New location | Reason |
|---|---|---|---|
| My leads | `/dashboard/team/leads` | Inbox → "Sales leads" tab | Both are lead inboxes |
| QR leads | `/admin/qr-leads` | Inbox → "QR leads" tab | Same |
| My referrals | `/dashboard/referral` | Referrals tab | Direct move |
| Performance | `/dashboard/team/performance` | Performance tab | Direct move |
| Advertisements | `/admin/advertisements` | Advertisements tab (keeps its own sub-tabs) | Nested, no functional change |
| QR analytics | `/admin/advertisements/analytics` | QR Analytics tab (promoted to top-level) | Currently buried two levels deep |
| Activity & reports | `/admin/reports` | Activity tab | Direct move |

QR Ads (personal QR templates the user prints/shares) is promoted from an admin sub-tab to its own top-level tab in the hub, because it's the primary tool for partners.

## Fixing the broken Inbox

Root cause: `/dashboard/team/leads` declares `validateSearch` with `orgId: z.string().uuid()` as required, but the hamburger link navigates without any search params.

Fix in the new Inbox tab:
- Make `orgId` optional in the search schema.
- If missing, the loader picks the user's default org (first org they belong to). If they have none, show an empty state with a "Create/join a business" call to action instead of an error screen.
- Add an org picker to the top of Inbox when the user belongs to more than one org.

## First-time onboarding

Overview tab shows a checklist card for new users:
1. Set up your referral link (links to Referrals tab)
2. Print/share your QR ad (links to QR Ads tab)
3. See your first scan (links to QR Analytics tab)
4. Reply to your first lead (links to Inbox)

Each item shows a green check once done (detected from existing data — first referral event, first QR template created, first scan, first lead reply). Card auto-dismisses once all four are complete.

## Hamburger menu change

The pink "Partner / Advertising" section collapses to a **single** entry: **"Partner Hub"** → `/dashboard/partner`. All the individual links go away from the drawer. This is the main "one roof" ask.

Staff-only tools that aren't partner-facing (Moderate listings, Business directory, Verifications, Manage sales reps) stay where they are — they don't belong in the partner hub.

## Files touched

- **New:** `src/routes/dashboard.partner.tsx` (layout + tab bar), `src/routes/dashboard.partner.overview.tsx`, `.inbox.tsx`, `.referrals.tsx`, `.qr-ads.tsx`, `.qr-analytics.tsx`, `.advertisements.tsx`, `.performance.tsx`, `.activity.tsx`, `.index.tsx` (redirects to overview).
- **Edited:** `src/routes/dashboard.team.leads.tsx` — make `orgId` optional, fall back to default org, remove crash.
- **Edited:** `src/components/site-header.tsx` — collapse the partner/advertising block in both the desktop dropdown and mobile drawer down to a single "Partner Hub" link (keeps the pink section styling).
- **Edited:** existing routes `/dashboard/team/leads`, `/dashboard/team/performance`, `/dashboard/referral`, `/admin/qr-leads`, `/admin/advertisements/analytics` — add `beforeLoad` redirects to their new hub tab so old links/bookmarks still work. Admin `/admin/advertisements/*` stays functional for admins who want the full page too.

## Not in scope

- No change to the actual advertising CRM, campaigns, or QR analytics data model — this is purely a navigation/UX reshuffle plus the Inbox fix.
- No change to how commissions or partner applications are approved.

## Confirm before I build

1. OK to keep `/admin/advertisements` reachable for admins as-is, and just mirror it into the hub? (Recommended — avoids breaking existing admin muscle memory.)
2. OK to merge "My leads" + "QR leads" into one Inbox with source tabs? (They're both lead lists, just different sources.)
