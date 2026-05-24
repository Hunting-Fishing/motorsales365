## Goal

Make every screen feel native on phones (360px and up), tighten touch targets and typography, and make the site installable as a home-screen app — without breaking the Lovable preview.

## 1. Global chrome (header, footer, layout)

- **`site-layout.tsx`** — shrink the big banner image on mobile (cap to ~96px) so the fold isn't eaten by the banner; keep desktop intact.
- **`site-header.tsx`**
  - Move the **Post a listing** CTA into the mobile drawer as the top, primary-styled item; surface it as a compact `+` icon button on small screens.
  - Make the mobile drawer (`Sheet`) full-height with grouped sections: Browse / Marketplace / Account / Admin, larger 44px touch targets, active route highlighting, and Sign in/Sign up pinned to the bottom.
  - Hide the "View as" staff switcher behind the drawer on mobile.
  - Add a sticky bottom **mobile tab bar** (Home, Browse, Sell, Messages, Account) visible only `< md`, with safe-area padding for iOS.
- **`site-footer.tsx`** — collapse link columns into accordion sections on mobile.

## 2. Public pages

For each: `index`, `browse.$category`, `listing.$id`, `shop.index`, `shop.$category`, `shop.p.$slug`, `rides.index`, `rides.$slug`, `businesses.index`, `businesses.$slug`, `map`, `pricing`, `sell`, `seller.$id`:

- Convert multi-column grids to single column under `sm`, 2-col under `md`.
- Filter/sort bars → bottom-sheet drawer triggered by a sticky "Filters" button on mobile.
- Hero typography: clamp display sizes; tighten line-height; reduce vertical padding.
- Listing cards: full-bleed image, price + title prominent, secondary meta truncated.
- Listing detail: gallery becomes swipeable full-width; sticky bottom "Message seller / Call" CTA bar on mobile.
- Map page: full-height map with a slide-up results sheet instead of side panel.
- Sell wizard: stack steps vertically, larger inputs, mobile-friendly image uploader.

## 3. User dashboard

`dashboard.tsx` (layout) + child routes (`billing`, `profile`, `businesses`, `favorites`, `likes`, `messages`, `rides`, `searches`, `verification`, `referral`, `tow`):

- Convert the dashboard side nav into a horizontally-scrollable pill bar on mobile + matching entry in the global drawer.
- All data tables → responsive: native table at `md+`, card list at `<md` (each row becomes a card with label/value pairs).
- Billing page specifically: invoice table → card list, invoice details drawer already works (just confirm width is `w-full sm:max-w-lg`), payment method cards stack with full-width action buttons.
- Messages: thread list as full-width on mobile, conversation view as full-screen with back button.

## 4. Admin panel

`admin.tsx` + all `admin.*` child routes:

- Side nav → top-of-page `Select` dropdown on mobile (admins jump between sections quickly).
- Wide data tables (users, listings, businesses, verifications, redemptions, audit, accounts, advertising) → wrap in `overflow-x-auto` containers with sticky first column AND a `<md` card fallback for the most-used screens (users, listings, verifications).
- Charts (analytics, performance, reports) → set min-height, allow horizontal scroll on the chart container, hide secondary legends on mobile.
- Forms (pricing, currencies, type-suggestions, shop) → single-column on mobile, full-width inputs.

## 5. Forms & inputs (project-wide)

- Ensure every text input has `text-base` (16px) on mobile to prevent iOS zoom-on-focus.
- Buttons hit min 44×44px on mobile.
- Date pickers / selects use mobile-native triggers where possible.
- Modals/dialogs become bottom sheets on mobile (`<Sheet side="bottom">` wrapper variant).

## 6. PWA (installable, manifest-only — no service worker)

Per Lovable guidance, ship a manifest + icons only. No `vite-plugin-pwa`, no service worker, so the editor preview stays unaffected.

- `public/manifest.webmanifest` with name, short_name (`365 MotorSales`), `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, and icon set.
- Generate app icons (192, 512, maskable 512) from the existing brand mark and place in `public/icons/`.
- Add iOS Apple touch icons (180×180).
- Wire manifest + theme-color + apple-mobile-web-app-capable meta tags in `src/routes/__root.tsx` head.

> Note: PWA install works only on the published/custom-domain site, not inside the Lovable editor preview. Offline support is intentionally not included.

## 7. Verification

- Use the preview at 360×644 and 768×1024 to spot-check: header drawer, home, browse, listing detail, sell, dashboard billing, admin users, admin analytics.
- Confirm Lighthouse "Installable" passes on the published URL after deploy.

## Technical details

- All breakpoints use Tailwind defaults (`sm 640`, `md 768`, `lg 1024`).
- New mobile tab bar lives in `src/components/mobile-tab-bar.tsx`, mounted from `site-layout.tsx` with `md:hidden` and `pb-[env(safe-area-inset-bottom)]`.
- Responsive table pattern extracted into `src/components/ui/responsive-table.tsx` (render-prop: `columns`, `rows`, optional `mobileCard`).
- Bottom-sheet dialog variant added by reusing existing `Sheet` with `side="bottom"`; no new dep.
- Icon generation via existing `imagegen` for 512×512 source + scripted resize into 192/180.
- No business logic, no server function, no database changes.
