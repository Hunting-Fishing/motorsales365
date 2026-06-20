## Three fixes

### 1. Remove "My QR code" from the Promote & Earn nav
It duplicates "QR Ads" / "My referral & stats". Drop the `/my-qr` item from the hub in `src/routes/dashboard.tsx`. (The footer link stays — only the dashboard hub is cleaned up.)

### 2. Surface promoter resources on the referral page itself
Right now Promoter Resources and Preview Scanner View only live in the sidebar, which you didn't see. I'll add a visible **resource strip** at the top of `/dashboard/referral` (below the header) with three cards:
- **Promoter resources** → `/dashboard/promoter-resources`
- **Preview scanner view** → `/resources/qr-landing`
- **QR Ads (print materials)** → `/dashboard/qr-ads`

Each card gets an icon, one-line description, and a button — so they're impossible to miss from the referral page.

### 3. Fix `/resources/qr-landing` 404
The route file (`src/routes/resources.qr-landing.tsx`) and `routeTree.gen.ts` both have `/resources/qr-landing` registered, so the 404 you saw is a stale dev preview. I'll restart the dev server so the new route is served. If the 404 persists after restart, I'll add console diagnostics and dig into the component's SSR render (the page should render fine with `preview` mode since data fetching is skipped).

### No other changes
- "Promote & Earn" label stays.
- `/dashboard/promoter-resources` content stays as built.
- Footer link to `/resources/qr-landing` stays.

## Files touched

- Edit `src/routes/dashboard.tsx` — remove the `/my-qr` item.
- Edit `src/routes/dashboard.referral.tsx` — add the resource strip.
- Restart dev server.
