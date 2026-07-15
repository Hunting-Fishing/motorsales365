## Goal
Make `/features` genuinely useful to non-technical readers: every feature explained in plain English, plus add the differentiators that aren't currently listed (free business microsites, free Shop Manager inventory access, invoice-from-inventory, etc.).

## Changes

### 1. Rewrite every feature entry in plain language
In `src/data/features-catalog.ts`, add a `plainLanguage` field to `Feature` and populate it for all ~30 entries. The row header will show it above the technical pitch so readers understand *what it means* before *what it does*.

Examples:
- **Double-entry GL** → "Every peso in and out is recorded twice, so your books balance automatically. If something's off, we tell you exactly where."
- **P&L Statement** → "A one-page 'am I making money?' report — sales minus costs, month by month."
- **Journal Drilldown** → "Click any number in a report and see the exact invoices, receipts, or expenses that make it up."
- Similar rewrites for RLS, VIN decode, DVI, escrow, etc.

### 2. Add missing "why we're better" features (new catalog entries)

**Marketplace / Business module**
- **Free Business Microsite** — every verified business gets `365motorsales.com/<slug>` (e.g. `/laoagtires`) with their listings, hours, map, contact, gallery, reviews. No web-dev, no hosting fees. Competitors charge $30–$150/mo for a Shopify/Wix site.
- **Custom Domain Attach** *(roadmap)* — point your own domain to the microsite.
- **Business Slug History & SEO** — old slugs redirect, so shared links never break.

**Shop Manager module**
- **Free Shop Manager Inventory (Business tier)** — any signed-up business gets the full Shop Manager inventory module free: add parts, track stock, set costs and prices. No per-seat fee. Competitors: Shopmonkey $199+/mo, Tekmetric $399+/mo.
- **Invoice From Inventory** — one click turns stock lines into a customer invoice; stock auto-decrements, COGS auto-posts to the GL. Explain in one sentence: "Pick parts from your shelf → invoice prints → stock and books update themselves."
- **Cross-Shop Stock Visibility** *(links to Parts Network)* — if you don't have it, another 365 shop probably does; sell it anyway.

**Parts Network module**
- **Wash-Sale Margin** — 365 buys from the shop that has the part, sells to the customer, and the difference funds the platform. Explain plainly: "Shops don't pay to list. We only earn when a part actually sells."
- **VIN-Accurate Fitment** — customer types plate/VIN, sees only parts that fit.

**Trust & Safety**
- **LTO/CR/OR Document Check** — plain: "Sellers upload their vehicle registration. AI reads it and flags fakes before the ad goes live."
- **Buyer Safety Checklist** — plain: "A short pre-meetup checklist that shows up on every vehicle ad. Meet in daylight, verify OR/CR, etc."

**Other cross-cutting**
- **Real-Time Everything** — one line: "Inventory, inquiries, messages, and stock update live, no refresh."
- **Nationwide Coverage, PH-First** — one line: "Built for Philippine roads, plates, and payment habits first — not a US template."
- **Ad-Free For Buyers** — no third-party display ads on listing pages.

### 3. Update comparison matrices
In `comparison-table.tsx` data, add rows for the new bullets:
- "Free business microsite (yourdomain.com/shop)" → 365: ✓, competitors: ✗
- "Free inventory module for businesses" → 365: ✓, Shopmonkey/Tekmetric/Orderry: paid tier
- "Invoice from inventory (auto-COGS)" → 365: ✓, ARI: ✗, Shopmonkey: ✓ (higher tier)
- "Cross-shop stock sharing" → 365: ✓, all others: ✗
- "Plain-language accounting UI" → 365: ✓, competitors: ✗

### 4. Row rendering
Update `feature-row.tsx` (and/or `module-section.tsx`) to render the new `plainLanguage` line prominently under the feature name, in a slightly larger muted-foreground style, before the existing "How it works" accordion body. No layout overhaul — just an extra line and the new entries flow in automatically.

### 5. Modules
- Add short plain-English `subhead` under each module intro on the `/features` page (e.g. Shop Manager → "Everything a repair shop needs to run the front desk, back shop, and books — in one place.")

## Out of scope
- No backend changes. Microsite routing (`/business/<slug>`) already exists; this only surfaces it on `/features` as a documented benefit.
- No pricing-rail changes beyond ensuring the new "free inventory" line lands in the comparison.
- No screenshot regeneration required; existing placeholders continue to work.

## Files touched
- `src/data/features-catalog.ts` — add `plainLanguage` field + ~10 new entries + rewrites
- `src/components/features/feature-row.tsx` — render plain-language line
- `src/components/features/comparison-table.tsx` — new comparison rows
- `src/routes/features.tsx` — module subheads (small copy edit)
