# Consolidate Dashboard navigation into hubs with tabs

Today the `/dashboard` sidebar has **22+ flat links** (My listings, My rides, Vehicle passport, Saved, Saved products, Liked, Saved searches, My learning, Messages, My businesses, Ad campaigns, Sponsorships, Shop Manager, Profile, My QR, Verification, Billing, Boost history, Wanted, Blocked, Team, Staff, Referral, Share kit, Tow, Dispatch, Job history…). That is what users are calling "everywhere / not organized." We'll apply the same hybrid pattern we already shipped for the Admin portal: a small set of **hub pages**, each with a **tabs row** at the top for its sub-pages, plus a few standalone links for things that don't belong in a hub.

## Proposed hub layout

Sidebar shrinks from ~22 links to ~7 entries.

```text
SIDEBAR                       HUB PAGE TABS (top of content area)
─────────────────────────     ──────────────────────────────────────────────────
Overview                      (dashboard home — quick stats, shortcuts)
My Garage           ▸         Listings · Rides · Vehicle Passport · Wanted posts
Saved & Activity    ▸         Saved listings · Saved products · Saved searches · Liked
Inbox               ▸         Messages · Blocked users
My Business         ▸         Businesses · Shop Manager · Ad campaigns · Sponsorships
                              · Team* · Staff & Access*       (*only if in an org)
Referral & Share    ▸         My referral · Share Kit · My QR code   (only if staff/referral)
Dispatch            ▸         Tow requests · 365 Dispatch · Job history (only if provider)
Account             ▸         Profile · Verification · Billing · Boost history · My learning
─────────────────────────
Admin / Staff console         (single link, staff only — unchanged)
```

Conditional hubs (Referral, Dispatch, Team/Staff tabs) stay conditional — exactly like today — so non-staff users see an even shorter sidebar.

## How the tabs work

Same shape as `/admin/advertisements`:

- Each hub gets a parent route that renders a sticky `Tabs` row built from `@tanstack/react-router` `<Link>` + `useRouterState`, then `<Outlet />` for the active sub-page.
- The hub's index tab opens the first sub-page (e.g. `/dashboard/garage` → Listings).
- Existing routes are **kept at their current URLs** so external links, emails, and bookmarks don't break — the hub pages just render the same content under a tab wrapper.
- Mobile: the existing dropdown sidebar becomes a 2-level dropdown (Hub → sub-page) using the same `DropdownMenu` we already use.

## Technical notes

- Edit `src/routes/dashboard.tsx`: replace the flat `BASE_NAV` array with a grouped `NAV_HUBS` structure; the sidebar maps over hubs and the desktop active state highlights the hub whose sub-routes match the current pathname.
- Add thin parent route files: `src/routes/dashboard.garage.tsx`, `dashboard.saved.tsx`, `dashboard.inbox.tsx`, `dashboard.business.tsx`, `dashboard.account.tsx`. Each renders a `<HubTabs items=[...] />` + `<Outlet />`. The existing leaf routes (`dashboard.rides.tsx`, `dashboard.vehicles.tsx`, etc.) keep their URLs and need no changes.
- Reuse the existing `Tabs` styling from the Advertisements hub (`src/routes/admin.advertisements.tsx`) for visual consistency.
- Update the mobile `MobileNavMenu` in `dashboard.tsx` to render hubs with their sub-items grouped under headers.
- No data, permissions, or business logic changes — purely navigation/presentation.
- No DB changes, no server-fn changes.

## Out of scope (confirm if you want these included)

- Reorganizing the **main site header** (Post a listing / Admin / avatar). Today's task is the user portal sidebar only.
- Reorganizing the **Shop Manager** internal navigation — that's a separate app.
- Renaming any pages — labels above keep current wording.

## Acceptance

- `/dashboard` sidebar shows ≤ 8 entries (plus conditional Dispatch/Referral/Admin).
- Each hub page shows a tabs row matching the list above; clicking a tab navigates to the existing leaf URL.
- All existing dashboard URLs continue to work (no 404s, no broken bookmarks).
- Mobile dropdown groups items under hub headers.
