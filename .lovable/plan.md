## Goal
Rebuild the `/signup` page presentation to match the selected "Enterprise marketplace grid" direction: a single card, split into a navy brand/value panel (left) and a compact, densely gridded form (right). Reduce vertical scroll, look professional at first impression. All existing form logic, validation, phone E.164 preview, PH address cascade, terms gating, Google OAuth, and submit behavior stay intact.

## Scope
- Presentation-only rewrite of `src/routes/signup.tsx` layout and styling.
- No changes to auth flow, validation rules, server functions, or address data hooks.
- No new dependencies.

## Design tokens (locked from user's picks)
- Palette (Navy Trust): `#0f1b3d` (deep navy), `#1e3a5f` (mid navy), `#3b6fa0` (accent blue), `#e8edf3` (page bg / hairlines).
- Fonts: Sora (headings) + Manrope (body). Load via `<link>` in `src/routes/__root.tsx` head (per Tailwind v4 remote-font rule) if not already loaded.
- Use existing semantic tokens where possible; add Navy Trust variables in `src/styles.css` (`--color-navy-900`, `--color-navy-700`, `--color-navy-500`, `--color-navy-50`) mapped in `@theme inline` so classes like `bg-navy-900` work. No hardcoded hex in JSX.

## Layout structure
```
Page bg: navy-50 (#e8edf3), centered
  Card: max-w-5xl, rounded-2xl, shadow-2xl, overflow-hidden
    ├── Left panel (hidden on <md, 40% width on md+)
    │     bg navy-900, white text
    │     ├── Logo lockup (365 MotorSales)
    │     ├── H2: "Join the premier automotive marketplace."
    │     ├── 2–3 trust bullets (Verified inventory, Secure transactions, Nationwide reach)
    │     └── Footer copyright line
    └── Right panel (form, flex-1)
          Max-width ~28rem inner column, py-8 px-10
          Header: "Create your account" + "Already have an account? Sign in"
          Form sections (tight vertical rhythm):
            1. Account type — segmented control (3 buttons in slate-100 pill, active = white shadow)
            2. First/Last name — 2-col grid
            3. Mobile / Email — 2-col grid; mobile keeps country selector + E.164 preview under input
            4. Location section (hairline divider above):
                 - Region + Province (2-col)
                 - City/Municipality (col-span-2) + Postal (1) — 3-col grid
                 - Street address full-width
                 - "Use my location" link aligned right in section header
            5. Password / Confirm — 2-col grid
            6. Terms checkbox
            7. Submit button (full width, navy)
            8. Divider "Or register with"
            9. Google OAuth button
```

## Field-by-field mapping (existing logic preserved)
- Account type radio group → segmented pill; keep the current 3 values and selected-state logic. Description text moves into left panel or a small helper caption under the pill (one line, changes per selection).
- Business/Dealer and Service Provider subforms (business name, service categories, etc.) remain but render inline below the segmented control when their type is active, still in the compact 2-col grid style.
- `PhoneInput` component keeps its current country selector + E.164 preview; restyle wrapper to match the compact input style (smaller padding, hairline border, focus ring in accent blue).
- Address cascade (Region → Province → City/Municipality) keeps existing dependent-select logic; visually tightened into the grid above. "Use my location" button keeps its current handler.
- Password strength hint stays as a small caption under the password field (not a big block) to preserve density.
- Terms checkbox + gating of submit stays.
- Google OAuth button keeps existing handler.
- Server-side signup submission, redirect on success, and error toasts unchanged.

## Files touched
- `src/routes/signup.tsx` — layout/markup rewrite; keep all imports, state, and handlers.
- `src/styles.css` — add navy-trust token block + `@theme inline` mappings; keep existing theme intact.
- `src/routes/__root.tsx` — add `<link>` preconnect + stylesheet for Sora + Manrope if not already loaded (head links only, no other changes).
- `src/components/phone-input.tsx` — minor className adjustments only if needed to fit the compact input height; no logic change.

## Non-goals
- No change to `/login`, other auth routes, or the OAuth `complete-profile` flow.
- No copy rewrite of Terms/Privacy links or any policy content.
- No change to SEO metadata beyond title/description already set for signup (keep as-is unless already generic).

## Verification
- `tsgo --noEmit` clean.
- Visual check via Playwright at 1440x900 (desktop, matches locked preview viewport) and 1024x768 (laptop) to confirm the form fits with minimal scroll and the split-screen renders correctly. Mobile (<768px) collapses to single column with the brand panel hidden — matches the prototype.
- Manually confirm submit still creates account (form handlers untouched).
