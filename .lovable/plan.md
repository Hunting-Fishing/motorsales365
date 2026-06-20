## Goal

On `/resources/qr-landing` (and the live `/r/$code` page), do two things:

1. Delete the "Lead capture form" section entirely (both the preview placeholder and the live `<QrLeadForm />`).
2. Bring back the 4 uploaded banner images you just attached, but as small, screen-relative thumbnails next to the matching section headlines — click to expand to full size in a lightbox (same Dialog pattern already used on the page).

## Image → section mapping

| Banner image | Section it accents |
|---|---|
| `find-vehicles-parts-services-faster.png` | Hero (top of page, next to the headline) |
| `post-connect-sell.png` | "How it works — From scan to sale in four steps" |
| `one-platform-many-opportunities.png` | "What's on 365 — Every part of the motor world" |
| `discover-motor-services-near-you.png` | "Why 365 beats the alternatives" OR the audience/services band above the comparison table (final placement chosen to match the section's topic) |

## Sizing rule

- Mobile: `h-16` thumbnail (a small inline accent that sits beside or above the headline).
- Tablet/desktop: max `h-20` to `h-24` and capped at roughly 20–25% of the section width via `max-w-[260px]` — never a full-width banner.
- Rounded corners, subtle border, `cursor-zoom-in` affordance, accessible alt text.
- Click opens the existing `Dialog` lightbox at near full screen (`max-w-5xl`, `max-h-[90dvh]`) — the same component the page already uses for the small feature/category thumbnails. Image inside the dialog uses `object-contain` so the full banner is visible without cropping.

These stay decorative: they accent the section, they do not replace any text content.

## Files changed

1. `src/components/qr-landing-content.tsx`
   - Add 4 new asset imports for the uploaded banners.
   - Add a small `SectionBanner` helper component (thumbnail + Dialog lightbox) — reuses the existing Dialog/VisuallyHidden imports, no new dependencies.
   - Place a `<SectionBanner />` in the hero, "How it works", "What's on 365", and the services-related section per the mapping above.
   - Remove the entire `<section>` block at lines ~842–871 (the "Lead capture form" preview placeholder and the `<QrLeadForm />` render).
   - Remove the now-unused `import { QrLeadForm } from "@/components/qr-lead-form"` line.
   - Also remove the "lead submissions are disabled in preview mode" mention from the preview banner copy (line ~450) since the form no longer exists — keep "Tracking is disabled in preview mode."

2. `src/assets/qr-landing-uploaded/` — 4 new `.asset.json` pointer files created via `lovable-assets create` from the uploaded files at `/mnt/user-uploads/`:
   - `find-vehicles-parts-services-faster.png.asset.json`
   - `discover-motor-services-near-you.png.asset.json`
   - `post-connect-sell.png.asset.json`
   - `one-platform-many-opportunities.png.asset.json`

No other files change. `QrLeadForm`, the `qr_leads` table, and the admin leads page are left in place untouched — only the public-facing capture surface is removed. If you also want the lead row in the admin nav removed or the table dropped, say the word and I'll add that as a follow-up.

## Verification

- Visit `/resources/qr-landing` in the preview at the current viewport (mobile-ish, 934px) and at desktop: the banners should read as small accents, not hero-takeover blocks; clicking each opens the lightbox.
- Confirm the "Lead capture form" section is fully gone (no headline, no field chips, no live form).
- Build passes (no leftover `QrLeadForm` reference).
