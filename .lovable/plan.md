## What's already there vs. what's missing

- `/learn` + `/dashboard/learning` — public automotive courses (parts, mechanics). Not staff training.
- `/partner-training` — external partner schools directory. Not staff training.
- `/help/*`, `/guidelines`, `/start-selling`, `/support` — public help pages for buyers/sellers.
- `/admin/staff-365` — admin roster of staff accounts.
- `/dashboard/staff` — seller's own staff (business seat management), NOT internal 365 training.

**No dedicated internal staff training / knowledge hub exists.** That's what we need for Jocelyn, Marwin, Joan, etc.

## Build: `/staff/academy` — 365 Staff Academy

An internal training / enablement hub gated to `@365motorsales.com` accounts (uses existing `isStaffEmail` helper in `src/lib/staff-domain.ts`).

### Route structure (all under `_authenticated/`, `noindex,nofollow`)

```
src/routes/_authenticated/staff.academy.tsx           → hub landing (categories + search + featured)
src/routes/_authenticated/staff.academy.$slug.tsx     → article/guide reader
```

Route gate: on mount check `isStaffEmail(user.email)`; if not staff → render a friendly "Staff-only" card with a link to `/support`. No SSR (already true for `_authenticated`).

### Landing page sections

1. **Welcome / your name / staff badge** — pulls first name from `profiles`, shows current role (from `user_roles`) as a chip.
2. **Search bar** — filters the article list client-side by title/tag/body excerpt.
3. **Category tiles** (icon + short blurb + count):
   - Selling Playbook — how to pitch 365 to sellers, walk them through posting a listing, boost, business claim
   - Feature Guides — one card per major app area (Listings, Boosts, Businesses, Parts, Tow, QR referrals, Passport, Ads)
   - Coming Soon — roadmap items with expected windows (Insurance compare, Live auctions, Vehicle history badges, Trade-in offers, Driver education hub, Loan/financing match — reuse existing `/roadmap-*` art)
   - Infographics & Shareables — downloadable PNG/PDF one-pagers (already have `src/assets/qr-landing-uploaded/*` and `src/assets/referral/*`)
   - Scripts & Objections — copy-paste sales scripts, objection-handling talking points
   - Compliance & Policy — links to `/terms`, `/privacy`, `/refund-policy`, Partner Program disclosure, Clubs accreditation rules
4. **Featured / recently updated** — latest 3 articles.
5. **Ask for help** — link to internal Slack/email + `/support` fallback.

### Content model

Two flavors — pick per article — kept simple to avoid a heavy CMS:

- **Static MDX-style TSX articles** for polished playbooks. File-based under `src/content/staff-academy/*.tsx`. Each exports `{ meta, Body }` with `meta = { slug, title, description, category, tags, updatedAt, status: "active"|"coming-soon"|"draft", heroImage? }`. A small `staff-academy-index.ts` aggregates them. This is fastest to iterate on and version-controlled.
- **Optional DB-backed articles** — only if the user wants non-devs to publish. Skipped in this first pass unless requested; add later as a `staff_academy_articles` table with RLS restricted to staff role.

Initial content seed (10-12 articles) covering the categories above, each ~200-400 words + a hero image + 3-5 bullet key takeaways + "next steps" CTA. Use existing `src/assets/qr-landing-uploaded/*` and `src/assets/referral/*` covers where they fit; no new image generation in the first pass.

### Reader page (`staff.academy.$slug.tsx`)

- Hero image, title, category chip, "Last updated" date, status pill (Active / Coming Soon / Draft).
- Body renders the TSX `<Body />` component (typographic prose using existing tokens).
- Sticky sidebar (desktop): table of contents + "Related articles" (same category).
- Footer: "Was this helpful?" thumbs up/down (writes to `form_feedback` table which already exists) + a "Suggest an edit" mailto to team@.

### Navigation entry points

- Add "Academy" to the dashboard sidebar for staff users only (existing sidebar already conditionally hides sections based on role — piggyback the same check).
- Add a Staff Academy card on `/admin/staff-365` linking to `/staff/academy` so admins can send new hires straight there.

### Head / SEO

`noindex,nofollow` on both routes (internal only). Route-specific `head()` titles like "Staff Academy — 365 Motor Sales" and per-article `head()`.

### Out of scope for this pass

- No DB table (all content in-repo).
- No video hosting beyond linking to YouTube/Loom URLs already provided.
- No progress tracking / certificates — that lives on `/learn` for public courses. Can be added later.
- No new image generation — reuse existing uploaded assets. New hero art can be added incrementally.
