## Goal
Turn `/parts` and listing detail pages from "Coming Soon" placeholders into a real, monetized parts surface — across all 4 channels you picked. Since you don't have any approvals yet, I'll build the infrastructure first so revenue starts flowing the moment each account gets approved (just paste the ID/key into a secret).

## Phase 1 — Foundation (works with zero approvals)

**Database**
- New `affiliate_links` table: `id, supplier_slug, label, url_template, tracking_param, is_active, priority`. Lets admins manage outbound deep-link templates per supplier (e.g. `https://shopee.ph/search?keyword={QUERY}&af_id={SHOPEE_AFFILIATE_ID}`).
- New `affiliate_clicks` table: logs every outbound click (`supplier_slug, query, listing_id, vehicle_id, user_id, visitor_id, referrer, ua, created_at`) — gives us our own analytics independent of supplier dashboards.
- New `ad_placements_parts` table (lightweight): in-house sponsored slots specifically for `/parts` so we can sell placements to PH shops while affiliate approvals are pending.

**Server**
- `src/lib/affiliate.functions.ts` — `getAffiliateLinks(query, vehicle)` builds tagged URLs from active templates, `recordAffiliateClick(...)` logs the click, then 302-redirects.
- `src/routes/api/public/go.$slug.ts` server route — every outbound link goes through `/api/public/go/<supplier>?q=...&listing_id=...`, which logs and redirects. This is what makes the whole funnel measurable + lets us swap suppliers without touching UI.

**UI**
- Replace the "Coming Soon" body of `affiliate-parts-section.tsx` with a real "Shop these parts" row that renders cards for each active supplier (Lazada, Shopee, Amazon, eBay, RockAuto, Amayama, etc.) using the make/model/year on the listing. Each card → `/api/public/go/...`.
- Add the same component to `/parts` keyed off the VIN/chassis search query.
- Keep the amber Coming Soon strip for whichever suppliers are still inactive — auto-hides as soon as their secret is added.

**Admin**
- New "Affiliate links" tab in `/admin/parts` to CRUD `affiliate_links` rows + see click counts.
- New "Sponsored slots" tab to manage in-house sponsored placements (PH shops) — pay-per-week or pay-per-click.

## Phase 2 — Approvals & wiring (one supplier at a time)

For each supplier you sign up with, the only work is:
1. I prep the signup checklist + give you the callback URL / site URL they'll ask for.
2. You apply at the affiliate portal.
3. Once approved, you paste the affiliate ID/API key — I store it via `add_secret`.
4. I flip the template's `is_active` to true and links go live.

**Suggested order** (fastest approval → slowest):
- **Shopee Affiliate PH** (Involve Asia) — usually 1–3 days
- **Lazada Affiliate PH** (Involve Asia or direct) — 1–7 days
- **eBay Partner Network** (Motors vertical) — 1–3 days, very generous for car parts
- **Amazon PA-API** — needs 3 qualifying sales in first 180 days, but apply now
- **Amayama / Megazip / PartSouq** — direct email partnerships; I'll draft outreach copy

## Phase 3 — Sponsored placements (revenue while we wait)

- "Featured shop" cards on `/parts` (Banawe row, Autohub, etc.) sold by your sales reps using the existing ad pipeline.
- Uses the same click-logging route, so shops get a real dashboard of clicks.
- This is the only channel where revenue is 100% in your control — no third-party approval needed.

## Phase 4 — OEM lead-gen layer

- Wire the existing `oem_parts_interest` form so when a VIN/chassis lookup returns matches from Amayama/PartSouq, we show "Get OEM quote" with an affiliate-tagged outbound link AND capture the lead in our DB.
- Dual revenue: their commission + we keep the lead for our own future D2C catalog (parts vision memory).

## Technical Notes

- `/api/public/go/...` is a TanStack server route under `/api/public/` so it bypasses the auth wall and is cheap to call.
- Click logging uses a publishable-key client + narrow `TO anon` INSERT policy; no service-role on a public endpoint.
- Affiliate IDs are non-secret per-supplier but I'll still store them as secrets so they don't end up in git.
- Honors the Parts vision memory (PH→SEA→global, country-scoped catalog, wash-sale + ad monetization) and the Terms sync rule (I'll add the affiliate disclosure update to `/terms` and `/affiliate-disclosure` in the same turn).

## What I'll need from you after the plan is approved

Nothing immediately — Phase 1 builds the whole infrastructure with no secrets needed. After it ships I'll hand you a checklist with apply-links for Shopee/Lazada/eBay/Amazon so you can start the approvals in parallel.

## Out of scope (for now)
- Building our own OEM catalog DB (separate, larger effort tracked in the Parts vision memory).
- Lazada scraper hardening — keep as-is until we have the real affiliate API.
- Stripe/payout work — pure affiliate, no money moves through us yet.