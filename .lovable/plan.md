## Goal

Let 365 members (advertisers, promoters, staff) preview what a first-time QR scanner sees on `/r/{code}`, so they can use it as a sales/promo resource and give feedback to improve it.

## Approach

Add a **"QR Landing Preview"** resource page that renders the same content as `/r/{code}` in a non-tracking, preview mode — reachable from the member dashboard and the site footer.

### 1. Refactor `/r/$code` into a shared component

- Extract the visual body of `src/routes/r.$code.tsx` (hero, "why 365 vs FB/Google", pricing comparison, lead form section) into a new component `src/components/qr-landing-content.tsx`.
- Props: `{ mode: "live" | "preview", referralCode?, promoterName? }`.
- In `preview` mode:
  - Skip the `recordTouch` / referral-credit cookie write.
  - Skip the lead-capture insert (render the `QrLeadForm` as a visual demo with a disabled submit + "Preview only — submissions disabled" note, OR hide the form and replace with a callout).
  - Show a top banner: "This is what a new visitor sees after scanning your QR code."
- `r.$code.tsx` keeps its loader/tracking and just renders `<QrLandingContent mode="live" referralCode={code} … />`.

### 2. New preview route: `/resources/qr-landing`

- File: `src/routes/resources.qr-landing.tsx` (public — promoters share it too).
- Renders `<QrLandingContent mode="preview" />` inside `SiteLayout`.
- Adds a "Promoter resources" header block above:
  - Short intro: how the QR funnel works (scan → land → lead).
  - Buttons: **"Get my QR poster"** → `/my-qr` (or `/r/{myCode}/poster` if signed-in promoter), **"View my leads"** → `/dashboard/referral`, **"Print materials"** → `/admin/advertisements/qr-ads` (admins only).
  - Tips list: where to place QR (helmet, shop window, business card), what to say when handing it out.
- `head()` with noindex (internal resource, not for SEO).

### 3. Entry points

- **Footer** (`src/components/site-footer.tsx`): add "QR landing preview" link under the existing Resources / Company column.
- **Member dashboard** (`src/routes/dashboard.index.tsx` or the dashboard quick-links): add a tile **"Preview QR landing page"** in the existing Promote / Referral section.
- **Referral dashboard** (`src/routes/dashboard.referral.tsx`): add a prominent "Preview what scanners see" link/button near the QR code display.

### 4. No DB changes

Pure UI/refactor. No migrations, no RLS changes, no new server functions.

## Files touched

- New: `src/components/qr-landing-content.tsx`
- New: `src/routes/resources.qr-landing.tsx`
- Edit: `src/routes/r.$code.tsx` (use shared component)
- Edit: `src/components/site-footer.tsx` (footer link)
- Edit: `src/routes/dashboard.index.tsx` and/or `src/routes/dashboard.referral.tsx` (member entry point)

## Open question

The lead form on the preview — **disable the submit** (so promoters see the exact form a visitor sees) or **replace it with a static "Lead form appears here" placeholder**? Default in this plan: disabled submit with a clear preview banner, since seeing the real form is more useful for promoter feedback.
