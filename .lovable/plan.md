# Phase B — Account-Team Visibility + Posting Etiquette Guide

Two scoped additions. No schema changes.

## 1. Show all users on a multi-user account (in Report dossier)

Problem: A business account (organization) can have multiple members. The current Posting User panel only shows the single user tied to the reported listing. If one teammate is the bad actor, staff need to see the rest of the team and their behavior at a glance.

### Data we already have
- `organizations` (the account)
- `organization_members` (org_id, user_id, role, joined_at)
- `profiles` (member_number, names, business_name, account_status, created_at)
- `listings`, `reports` — let us count per-member activity

### Changes

**`src/lib/admin-user-dossier.functions.ts`** (edit)
- Extend `getUserAdminDossier` to also resolve the user's `parent_org_id` (or any `organization_members` row).
- Add `listAccountTeammates({ userId })` server function (admin/moderator only) returning, for every member of the same org:
  - `user_id`, `member_number`, `display_name`, `role` (owner/admin/member), `joined_at`, `account_status`
  - mini-stats: `listings_active`, `reports_against`, `reports_taken_down`, `trust_score` (reuse the same scoring formula)
  - `is_focus` flag for the user the current report is about

**`src/components/admin/posting-user-panel.tsx`** (edit)
- If the user belongs to an org with 2+ members, render an "Account team" strip below the trust-score tiles:
  - Org name + kind badge + total members count
  - Horizontal list of teammate chips: avatar, `User #`, name, role pill, trust-score dot (red/amber/green), reports-against count
  - The focus user is highlighted; other chips are clickable → open the existing `UserDossierDialog` for that teammate
- Collapsed by default when >6 teammates ("Show all 12 teammates").

**`src/components/admin/user-dossier-dialog.tsx`** (edit)
- Add a "Team" tab (visible only when org exists) with the full teammate table: User #, name, role, joined, listings, reports against, taken-down, last activity, trust score, action → open their dossier.

No new tables, no migrations.

## 2. Posting Etiquette guide page

New public help page at `/help/posting-etiquette` that staff can link to from warnings, report-resolution emails, and rejection notices.

**`src/routes/help.posting-etiquette.tsx`** (new)
- Standard SiteLayout, proper SEO head (title, description, og:image — reuse share-kit cover).
- Single H1: "Posting Etiquette & Listing Guidelines".
- Sections:
  1. Why this matters (trust, buyer safety, account standing)
  2. Required info per listing type (vehicle / part / service / business) — checklists
  3. Photos — do/don't with example screenshot pairs (good vs bad)
  4. Pricing honesty — no bait pricing, no hidden fees
  5. Title & description — keyword stuffing, ALL CAPS, emoji spam
  6. Prohibited items (link to `/terms` section)
  7. Communication standards — response time, no off-platform redirects
  8. Reports & strikes — how reports work, what triggers takedown, appeal path
  9. Account standing & trust score — what raises/lowers it
  10. Multi-user accounts — owner is responsible for teammate conduct

**`src/components/help/etiquette-do-dont.tsx`** (new) — small reusable two-column "Do / Don't" card with check/x icons and optional image.

**Screenshots** — placeholders sourced from existing assets where possible; for the good/bad photo examples I'll generate 4–6 illustrative images (good listing photo, blurry photo, watermarked photo, screenshot-of-screenshot, good title example, bad title example). Stored under `src/assets/etiquette/`.

**Linking**
- Add a "Posting guidelines" link in `src/components/site-footer.tsx` under the Help column.
- Surface a small "Review posting guidelines" link inside `ReportCard` resolution actions and in the listing-rejection notice copy.

No backend, no schema.

## Technical notes

- All new admin queries gated by `has_role(auth.uid(),'admin'|'moderator')` (consistent with existing dossier loaders).
- Trust-score reuse: extract the formula in `admin-user-dossier.functions.ts` into a shared `computeTrustScore(stats)` helper so teammate chips and the focus panel agree.
- The etiquette page is fully static (no loader) so prerender is safe; metadata set via route `head()`.

## Out of scope (ask before doing)
- Editing/suspending individual teammates from the report panel (write actions).
- Auto-issuing warnings or strikes.
- Translating the etiquette page (English only for v1).

## Questions before I build
1. **Teammate chip click** — open their dossier in a nested dialog (stack on top of current), or replace the current dossier in place with a "back" button?
2. **Etiquette screenshots** — OK for me to generate illustrative images, or do you want to supply real screenshots from the live site after the page scaffolds?
3. **Strikes system** — out of scope here, but should I queue a Phase C plan for a real strike/warning ledger (3 strikes → suspend, etc.)?
