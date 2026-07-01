## Goal
Give partners a clear, at-a-glance confirmation that the FTC/DTI disclosure banner is live and being reused correctly across their referral surfaces.

## Where
`src/routes/dashboard.partner-program.tsx` — add a new "Disclosure verification" Card, placed just below the existing `InfluencerDisclosure` (before the QR/stats grid).

## What the section shows
1. **Header row**
   - Title: "Disclosure verification"
   - Status pill: green "Live on your referral pages" (static — the banner is always rendered on `/r/:code`, partner-program pages, and this dashboard).

2. **Live previews** (rendered using the real `<InfluencerDisclosure />` component so partners see the exact same markup buyers see):
   - Label "Banner (top of referral landing)" → `<InfluencerDisclosure variant="banner" partnerName={partner.display_name} />`
   - Label "Inline (in cards / posts)" → `<InfluencerDisclosure variant="inline" partnerName={partner.display_name} />`
   - Label "Footer (bottom of referral landing)" → `<InfluencerDisclosure variant="footer" partnerName={partner.display_name} />`

3. **Where it appears checklist** (static list with check icons):
   - Your referral landing page (`/r/{referral_code}`) — top banner + footer
   - Partner Program overview page
   - Partner application page
   - This dashboard

4. **"View live on your referral page" button** → opens `/r/{partner.referral_code}` in a new tab so partners can visually confirm.

5. **Copy-ready disclosure snippet** (for their own posts): reuse the existing wording
   `"I may earn a commission if you sign up through my 365 Motor Sales link."`
   with a Copy button (uses existing `toast` + clipboard pattern already in the file).

## Non-goals
- No schema changes, no server functions, no new dependencies.
- No changes to `InfluencerDisclosure` component itself — we render it as-is so the preview is guaranteed identical to production.
- No changes to other routes.

## Technical notes
- Purely presentational edit in one file.
- Uses existing imports (`Card`, `Button`, `Copy`, `toast`, `InfluencerDisclosure`) plus adds `CheckCircle2` and `ExternalLink` from `lucide-react`.
- Uses `siteOrigin()` already imported to build the referral URL for the "View live" button.
