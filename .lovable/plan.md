ns# Remaining Audit Implementation Plan

Work is grouped into 3 phases. Phase 1 ships immediately (high impact, low effort). Phases 2–3 follow after review.

## Phase 1 — Trust Quick-Wins (ship first)

These are content/consistency fixes that unblock publishing credibility. No schema changes.

1. **#3 Pricing consistency** — Audit `src/routes/index.tsx` (homepage seller blurb) and `src/routes/pricing.tsx` (and any plan tables) so photo/video limits match. Standardize on **20 photos, 1 video, 60-day listings, 5 active ads** for the free private-seller plan.
2. **#4 Contact info** — Replace placeholder `+63 917 000 0000` in `src/routes/contact.tsx` with `+63 969 606 3830`. Add Viber/Messenger/Facebook links + business hours block.
3. **#5 Email domain consistency** — Standardize all support emails on `@365motorsales.com` across `contact.tsx`, `terms.tsx`, `privacy.tsx`, `refund-policy.tsx`, footer.
4. **#8 Export liability fix** — Rewrite `src/routes/export.tsx` to Option A (marketplace-only): 365 "connects buyers with independent export brokers, inspection providers, and shipping partners" and explicitly disclaims broker/escrow/shipper/legal-rep roles. Align language with `/terms`.
5. **#15 Company Verification page** — New route `src/routes/company-verification.tsx` with: legal business name, DTI/SEC reg # (placeholder + note), business/service address, DPO email, support escalation flow, refund process link, takedown/complaint process, affiliate & advertising disclosures, law-enforcement contact. Link from footer.
6. **#6 "365 Verified" explainer page** — New route `src/routes/verified.tsx` listing verification levels (Email, Phone, ID, Document, Premium Passport) and buyer-safety tools (Report listing, Request OR/CR check, Safe meetup guide, Scam checklist, Never-pay-before-docs warning). Link from header/footer + listing trust badges.

Update `/terms` "Last updated" date (per memory rule).

## Phase 2 — Content & Onboarding

7. **#12 Public seller landing page** — New route `src/routes/sell.tsx` (server-rendered, no auth gate) with How it works, What you need, Plan comparison, Listing examples, Photo guide, OR/CR warning, Scam prevention, Dealer benefits. The existing authenticated post-listing flow stays under `/dashboard/...`.
8. **#2 SSR fallback content** — Add static headline + CTA + sample cards + FAQ to `sell-vehicle`, `request-a-tow`, `businesses`, `map` route components so crawlers and slow loads see meaningful content above the dynamic data block.
9. **#7 PH buyer document checklist** — New `BuyerDocumentChecklist` component shown on every listing detail page (`src/routes/listing.$id.tsx`) under the seller card: OR/CR present, owner match, deed of sale, valid IDs, chassis/engine/plate match, encumbrance check, HPG clearance, flood/accident disclosure, transfer-of-ownership guide link.
10. **#13 Structured listing fields** — Extend the listing form (`src/components/listing-form.tsx` or equivalent) and `vehicles` schema with: variant, fuel_type, registered_owner_status, or_cr_status, plate_ending, flood_history, accident_history, financing_available, trade_accepted, last_registration_date, price_negotiable. Mirror motorcycle-specific fields. Migration adds nullable columns; display in listing detail.
11. **#1 Seed inventory** — Add 8–12 clearly-flagged **"Sample listing"** vehicles + 6 sample business profiles via a seed migration, owned by a system "365 Demo" user. Each carries an `is_sample` boolean so we can hide once real inventory arrives.
12. **#10 Shop affiliate products** — Seed 15+ affiliate items (OBD2, dash cams, helmets, jump starters, etc.) into the shop catalog with category filters.
13. **#11 Business directory seeding** — Same approach: 10+ sample profiles across repair, towing, dealers, parts, detailing, insurance.

## Phase 3 — Growth & Monetization

14. **#9 Additional PH payment options** — Add Maya, QR Ph, bank-transfer manual upload, PayPal toggles to checkout + receipt download. (Stripe rails where supported; manual flow for bank transfer with admin verification.)
15. **#16 Public ad rate card** — New `src/routes/advertise.tsx` with placement matrix + starter bundles (Local Shop ₱499, Dealer Visibility ₱1,499, Province Domination ₱4,999, National custom).
16. **#17 Learn monetization** — Add course-marketplace scaffolding, sponsored slots, mechanic certification badges on business profile, "Hire trained mechanic" filter, per-course affiliate product strip.
17. **#19 Wanted (buyer requests)** — New `wanted_posts` table + `/wanted` route + post form. Sellers/shops can respond via existing messages system.
18. **#20 Inspection / transaction-assistance upsells** — Paid service products (pre-purchase inspection, document verification, transaction-assistance partner). Use the existing boost/passport-premium Stripe pattern. Avoid the word "escrow".

## Technical Notes

- Phases 1–2 items 7–9 require **no schema changes**; can ship in one batch.
- Items 10, 11, 13, 17 need migrations — each in its own migration file with GRANTs + RLS per project rules.
- Stripe additions (item 18) reuse `passport-premium` checkout pattern + webhook.
- Every change touching fees/services/data triggers Terms/Privacy/Refund sync (per memory `mem://policies/terms-sync`).
- All new routes need `head()` metadata (title, description, og:*) — no shared metadata.

## Execution Order

Start with **Phase 1 (#3, #4, #5, #8, #15, #6)** in one batch since it's all frontend content + 2 new static routes. Pause for review, then proceed to Phase 2.