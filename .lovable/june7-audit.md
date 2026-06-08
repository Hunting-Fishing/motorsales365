# June 7 Audit — 365MotorSales.com Pre-Launch

Source: ChatGPT audit (uploaded `365 audit by chat gpt.docx`, June 7).
Purpose: working checklist of issues to correct before launch. Check items off as we ship them.

---

## Overall Verdict
365MotorSales.com has the right **architecture**, but needs more **proof**, **inventory**, and **operational clarity**. Today it reads as "a strong platform shell with many monetization directions, but not enough visible marketplace activity yet." Fastest fix: fill it with listings, businesses, safety tools, seller proof, and local PH transaction guidance.

---

## Priority Build Order

### Do these FIRST (pre-launch blockers)
- [x] 1. Fix contact phone and email domain inconsistency
- [x] 2. Resolve pricing / photo-limit inconsistency
- [x] 3. Add real or seeded listings
- [x] 4. Add visible seller onboarding page
- [x] 5. Add real business directory listings
- [x] 6. Fix "Loading…" pages for SEO and trust (SSR fallback content)
- [x] 7. Clarify export page liability conflict
- [x] 8. Add trust / verification explainer page
- [x] 9. Add scam-report and buyer-safety workflows
- [x] 10. Add affiliate products to Shop

### Then build monetization
- [ ] Boosted listings
- [ ] Dealer subscriptions
- [ ] Business directory paid profiles
- [ ] Sponsored ad placements
- [ ] Inspection referrals
- [ ] Parts / tool affiliate shop
- [ ] Learn / course sponsorships
- [ ] Export lead referral (not direct brokerage unless legally structured)
- [x] Buyer "wanted" posts
- [ ] Vehicle Passport subscription / premium history report

---

## 1. Marketplace Liquidity — No Listings Yet
Homepage shows "No listings yet — be the first to post one." Largest conversion problem.

**Add seed inventory:**
- Dealer-supplied vehicles
- Imported Facebook Marketplace leads (with permission), manually entered
- "Dealer demo listings"
- "Coming soon" verified dealer stock
- Public business profiles for repair shops, towing, parts, car wash, detailing
- Example listings clearly marked "Sample listing"

## 2. Unfinished / "Loading…" Pages
`Sell your vehicle`, `Request a tow`, `Businesses`, `Map` show "Loading…" to crawlers. Hurts SEO, trust, sharing previews.

**Every major page needs server-rendered fallback:** headline, what the page does, visible CTA, example cards, FAQ, contact option, "no results yet" + next action.

## 3. Pricing Inconsistency
Homepage: 5 active ads / 12 photos / 1 video / 60-day listings.
Pricing page: 20 photos / 1 video.

**Pick one plan table everywhere:**

| Plan | Price | Listings | Photos | Video | Best For |
|---|---|---|---|---|---|
| Private Seller | Free | 5 active | 12 or 20 (pick one) | 1 | Normal users |
| Verified Seller | ₱149/mo | More | More | Yes | Frequent sellers |
| Dealer Starter | ₱499/mo | 25 | More | Yes | Small dealers |
| Dealer Pro | ₱1,499/mo | Unlimited | More | Yes | Serious dealers |

## 4. Placeholder Contact Info
Contact page shows `+63 917 000 0000`. Real number was `+63 969 606 3830`.

Replace with: real phone, Viber/WhatsApp/Messenger buttons, Facebook link, business hours, region served, support ticket form, "Report scam/listing" form.

## 5. Email / Domain Inconsistency
Mix of `@365motorsales.ph` (contact page) and `@365motorsales.com` (terms — legal@). Pick one. **Recommended: `@365motorsales.com`** unless `.ph` is fully controlled and used.

## 6. Visible Trust System — Add "365 Verified" Page

| Badge | Meaning |
|---|---|
| Phone Verified | Phone number confirmed |
| ID Verified | Government ID checked |
| OR/CR Checked | Vehicle registration reviewed |
| Business Verified | DTI/SEC/BIR/LGU docs checked |
| Dealer Verified | Business + inventory review |
| 365 Inspected | Optional physical inspection |

**Buyer safety tools:** Report listing · Request OR/CR check · Request inspection · Scam warning checklist · Safe meetup guide · "Never send full payment before doc verification" warning · Seller response-time score · Seller join date · # active listings · Previous sold listings.

## 7. PH Vehicle-Document Workflow (biggest trust moat)
Guided checklist per vehicle: OR/CR present · Registered owner matches seller · Deed of sale ready · Valid IDs ready · Chassis number matches CR · Engine number matches CR · Plate number matches · LTO alarm/check · Encumbrance / chattel mortgage check · HPG clearance (high-value) · Flood/accident disclosure · Transfer-of-ownership guide.

## 8. Export Page Liability Conflict
Terms say 365 is **not** a broker/escrow/shipper. Export page advertises brokerage + escrow.

**Recommended (Option A — marketplace only):** "365 connects buyers with independent export brokers, inspection providers, and shipping partners. 365 does not act as broker, escrow agent, shipper, or legal representative."

Option B (real export division) requires separate export terms, broker agreement, inspection disclaimer, shipping partner agreement, refund/cancellation policy, KYC/AML, customs disclaimer, money-flow + liability clarity.

## 9. Payments — Expand for PH Market
Add: Maya · QR Ph · Bank transfer · Manual payment upload (early stage) · GCash send-to-number backup · PayPal (international) · Cash instructions for local ad reps · Invoice/receipt download · "Pay with GCash" guide.

## 10. Shop is Empty — Seed Affiliates
OBD2 scanners · Dash cams · Motorcycle helmets · LED lights · Car covers · Battery chargers · Jump starters · Tire inflators · Detailing kits · Ceramic coating · Tools · Phone mounts · Motorcycle rain gear · Truck accessories · Sun shades · Seat covers · Floor mats. (Fitment filters can come later — don't block on perfect data.)

## 11. Business Directory — Seed Profiles
Categories: Repair shops · Towing · Used car dealers · Motorcycle dealers · Parts stores · Tire shops · Car wash/detailing · Salvage yards · Gas stations · Driving schools · Insurance agents · Financing agents · Import/export brokers.
Each profile: name, address, map pin, phone, Messenger/FB, hours, services, photos, "Claim this business" button, Verified/Unclaimed badge, reviews, sponsored upgrade option.

## 12. Seller Onboarding Page
Visible (non-auth) landing: How it works · What you need · Plan comparison · Listing examples · Tips for selling faster · Photo guide · Required vehicle info · OR/CR warning · Scam prevention · Dealer benefits · Bulk upload preview · Sales rep tracking explanation.

## 13. Listing Quality Standards
**Cars:** Year · Make · Model · Variant · Engine · Transmission · Fuel · Mileage · Location · Registered owner status · OR/CR status · Plate ending · Color · Condition · Flood history · Accident history · Financing available · Trade accepted · Last registration date · Seller type · Price negotiable · Video walkaround · VIN/chassis (optional/private).
**Motorcycles:** Year · Make · Model · Engine displacement · Mileage · OR/CR status · Registered owner status · Modifications · Plate status · Registration expiry · Location · Price negotiable.

## 14. "365 Vehicle Passport"
Per-vehicle long-lived profile: owner timeline · service history · photos · mods/upgrades · accident/flood disclosure · maintenance receipts · ownership count (no private names) · transfer page on sale · public/private toggle · QR code.

## 15. Trust / Legal Proof in Footer — "Company Verification" Page
Legal business name · DTI/SEC reg # · BIR status · address · DPO email · support escalation · refund process · takedown process · complaint process · affiliate disclosure · advertising disclosure · law enforcement contact.

## 16. Advertising — Public Rate Card

| Placement | Suggested Price |
|---|---|
| Homepage hero sponsor | ₱2,500–₱10,000/mo |
| Category banner | ₱1,000–₱5,000/mo |
| Listing sidebar tile | ₱750–₱3,000/mo |
| Business directory featured | ₱500–₱2,000/mo |
| Learn sponsor card | ₱500–₱2,500/mo |
| Newsletter sponsor | ₱500–₱2,000/send |
| Local province sponsor | ₱500–₱3,000/mo |

**Bundles:** Local Shop ₱499/mo · Dealer Visibility ₱1,499/mo · Province Domination ₱4,999/mo · National Brand (custom).

## 17. Learn — More Commercial Purpose
Free mini-courses · paid course marketplace · sponsored training schools · mechanic certification badges · "Hire trained mechanic" directory · repair shop training subscriptions · tool affiliates under each course · course completion badge on business profile.

## 18. Reviews & Reputation
Seller reviews · business reviews · buyer feedback · Verified Transaction badge · Responds Fast · Documents Checked · Inspection Completed · Repeat Seller · Top Dealer in Province.

## 19. "Wanted" Posts (buyer-side demand)
Examples: "Looking for Toyota Vios under ₱300k in Ilocos" · "Need multicab in Cebu" · "Need used 4D56 engine" · "Need towing Laoag→Manila" · "Need pre-purchase inspection mechanic" · "Need motorcycle under ₱50k". Sellers/shops/dealers respond → leads even without large inventory.

## 20. Inspection & Transaction-Safety Upsells

| Service | Possible Price |
|---|---|
| OR/CR document review | ₱199–₱499 |
| Seller ID verification | ₱99–₱299 |
| Pre-purchase inspection lead | ₱500–₱2,500 |
| Mechanic inspection booking fee | Commission |
| Vehicle history / passport report | ₱199–₱999 |
| Safe transaction assistance | Flat fee or % |
| Escrow referral | Partner commission |

**Caution:** avoid the word "escrow" unless using a regulated partner — use "transaction assistance" or "payment release partner."

---

## Progress Log
- 2026-06-08 — Audit file created from uploaded doc. Starting at item #1 (contact phone + email domain inconsistency).
- 2026-06-08 — Item #1 done (phone + email standardized).
- 2026-06-08 — Item #2 done. Standardized free Private Seller tier at **12 photos / 1 video**; paid tiers at **20 photos**. Updated `pricing.tsx`, `sell.tsx` (tier caps, copy, validation), `plan-limits.ts` defaults, and `subscription_plans.Private Seller.max_photos_per_listing` 20 → 12.
- 2026-06-08 — Item #3 done. Seeded **12 sample listings** (5 cars, 4 motorcycles, 1 equipment, 1 drone, 1 boat) across NCR / Region I / VII / XI, each with one photo. All owned by "365 MotorSales" profile (`a3999f39…`), titles prefixed `[Sample]`, `source='seed'`, `attributes.seed=true`. Cleanup: `DELETE FROM listings WHERE source='seed'` (cascades to media).
- 2026-06-08 — Item #4 done. New public route `/start-selling` (no auth) covering: hero + CTA, 4-step "How it works", what-you-need (OR/CR checklist + photo tips), plan comparison snapshot linking to `/pricing`, tips to sell faster, scam-prevention card, 365 Verified explainer linking to `/dashboard/verification`, dealer section, final CTA. Footer "Sell" column now leads with **How selling works → Post a listing**.
- 2026-06-08 — Tightened sell-flow media validation. Refactored single `video` state to `videos: File[]` with per-item `videoUploads[]`, retry, and progress. Caps are now Free = 12 photos / 1 video, Paid (Standard & Upgraded) = 20 photos / **3 videos** (Standard was previously 2). `handleVideo` slices to remaining cap with overflow toast; submit blocks if `photos.length > maxPhotos` or `videos.length > maxVideos`. Plan radio copy and Standard/Upgraded tierCaps updated to reflect 3 videos on paid tiers.
- 2026-06-08 — Item #5 done. Seeded 14 sample business directory profiles across PH categories (repair, towing, parts, tire, carwash, motorcycle, used dealer, body/paint, battery, audio/tint, salvage, driving school, insurance, financing) spanning NCR, Region I, VI, VII, XI. All owned by 365 MotorSales platform account, `status='active'`, `source='seed'`, `source_external_id='seed-biz-NN'`, names prefixed `[Sample]`. Cleanup: `DELETE FROM businesses WHERE source='seed'`.
- 2026-06-08 — Item #6 done. Replaced bare "Loading…" full-page returns on `/sell` and `/tow` with SSR-friendly fallback shells: page hero, "How it works" steps, sign-in CTAs, and supporting copy — so crawlers and first-paint users see real content. Tightened inline loading copy on `/businesses` ("Finding businesses near you…") and `/map` ("Loading nearby businesses…"); both already render skeletons + page chrome during fetch.
- 2026-06-08 — Item #7 done. Rewrote `/export` to Option A (marketplace/intro venue) so the page matches Terms §18A. Hero is now "365 Export Connect — Partner network" with an explicit disclaimer that 365 is not the broker, escrow agent, shipper, exporter of record, or customs agent. Feature cards swapped "Full documentation"/"Door-to-port shipping"/"Escrow via international wire" for partner-coordinated wording and "Pay your partner directly". Inquiry section retitled "Request a partner intro" with an Info call-out card linking to `/terms`, updated SEO meta, success toast, and CTA copy ("Request a partner intro"). Inquiry form + serverFn unchanged — request capture works end-to-end.
- 2026-06-08 — Item #8 done. Created `/export/trust` — a public trust & verification explainer for 365 Export Connect. Covers: how partners are screened (business registration, export track record, contact verification, ongoing monitoring); partner badge meanings (Partner Verified, Documents Reviewed, Seller Recommended, PH-based Office); a 6-step buyer due-diligence checklist (DTI/SEC search, phone confirmation, reference requests, customs accreditation check, traceable payments, written quotes); red flags (full upfront payment, no address, generic email, off-platform pressure); reporting instructions; FAQ clarifying 365's non-guarantor role. Linked from `/export` feature cards and footer "Export" column.
- 2026-06-08 — Item #9 done. New `/report` route + extended `public.reports` schema (target_type, business_id, target_url, category, evidence_urls, optional reporter contact). Private `report-evidence` storage bucket — anon/auth can upload, only moderators/support can read. Footer "Company" column now links to "Report a scam".
- 2026-06-08 — Item #10 done. Seeded **21 affiliate products** in Shop covering the audit's checklist: OBD2 scanners (×2), dash cams (×2), motorcycle helmet + rain suit, LED headlights + off-road light bar, car cover, smart battery charger, jump starter, cordless tire inflator, detailing kit, 9H ceramic coating, 120-pc mechanic tool set, magnetic + wireless-charging phone mounts, truck bed liner, sun shade, seat covers, 3D floor mats. Each tagged `365-seed`, mapped to existing shop categories, and linked to a Shopee PH search URL via `shop_product_links` so buy buttons work immediately. Cleanup: `DELETE FROM shop_products WHERE '365-seed' = ANY(tags)` (cascades to links).
- 2026-06-08 — Item #16 done. Published a **public advertising rate card** on `/advertise` with the audit's PHP price ranges: homepage hero (₱2,500–10,000/mo), category banner (₱1,000–5,000/mo), listing sidebar tile (₱750–3,000/mo), business directory featured (₱500–2,000/mo), Academy sponsor card (₱500–2,500/mo), newsletter slot (₱500–2,000/send), province sponsor (₱500–3,000/mo). Plus the 4 bundles (Local Shop ₱499, Dealer Visibility ₱1,499, Province Domination ₱4,999, National Brand custom). Cross-linked from `/terms` §8 and bumped "Last updated".
- 2026-06-08 — Item #15 done. New `/company` route (Company verification) consolidating legal proof in one place: legal entity + RA 11967 registration framing, contact emails (support / legal / DPO / trust / advertising / partners / law-enforcement), 4-step support escalation (1d → supervisor 3d → legal 10d → DTI/NPC), refund process (links to `/refund-policy`), takedown/complaint process under RA 11967 §22, sponsored-content & affiliate disclosure with cross-links to `/advertise` and `/affiliate-disclosure`, and trust commitments (no data sale, not a broker/escrow/shipper, verified-badge basis, scam warnings). Footer "Company" column now links to it as "Company verification".
- 2026-06-08 — Item #19 done (Buyer "wanted" posts). New tables `wanted_posts` (title, description, category, budget range, region/city, contact method, status open/closed/expired, 30-day expiry, response_count) and `wanted_post_responses` (message, optional listing_id/business_id, contact). RLS: anon can read open posts + their responses; authenticated can create their own posts and respond to open posts; only authors can edit/delete. Triggers maintain `response_count` and validate expiry/budget. New public routes `/wanted` (browse with category + region filters, hero with example queries), `/wanted/new` (auth-gated form), `/wanted/$id` (detail + responses + reply form, owner can close/reopen). Dashboard nav adds "Wanted posts" → `/dashboard/wanted` for owner management. Footer "Sell" column now links the wanted board.
- 2026-06-08 — Item #13 done (Listing Quality Standards). New shared `VehicleQualityFields` component captures, for cars + motorcycles: variant/trim, color, plate ending, plate status (moto), registered owner status, OR/CR status, last registration date, registration expiry (moto), flood history, accident history, modifications (moto), VIN/chassis, plus checkboxes for price negotiable / financing available / trade-in accepted. Wired into `/sell` (new listing) and `/listing/$id/edit`, persisted into `listings.attributes` JSONB (no schema change). On the listing detail page, the existing Specifications grid auto-renders the new fields; updated the renderer to show booleans as Yes/No. Edit form hydrates the values and clears them on save so blanking a field actually removes it.
- 2026-06-08 — Item #13 validation + completeness. `VehicleQualityFields` now ships a zod `VehicleQualitySchema` and `validateVehicleQuality()` that enforces: VIN/chassis = 11–17 chars `[A-HJ-NPR-Z0-9]` (no I/O/Q), plate ending = single digit 0–9, dates parse and `last_registration_date` ≤ today / ≥ 2000-01-01, dropdowns must match the canonical option list, and text bounds on variant (80) / color (40) / modifications (500). Inputs enforce max length + numeric-only / uppercase normalization at the field level. The component also renders a profile-completeness meter (Progress bar + missing-field list) based on a category-specific recommended set (cars: variant, color, owner, OR/CR, last reg, flood, accident; motos: color, owner, OR/CR, plate status, registration expiry, accident). `/sell` and `/listing/$id/edit` run the validator on submit, block save with a toast on the first issue, and pipe per-field errors back into the form for inline display.
