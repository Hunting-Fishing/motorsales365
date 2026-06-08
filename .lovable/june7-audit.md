# June 7 Audit — 365MotorSales.com Pre-Launch

Source: ChatGPT audit (uploaded `365 audit by chat gpt.docx`, June 7).
Purpose: working checklist of issues to correct before launch. Check items off as we ship them.

---

## Overall Verdict
365MotorSales.com has the right **architecture**, but needs more **proof**, **inventory**, and **operational clarity**. Today it reads as "a strong platform shell with many monetization directions, but not enough visible marketplace activity yet." Fastest fix: fill it with listings, businesses, safety tools, seller proof, and local PH transaction guidance.

---

## Priority Build Order

### Do these FIRST (pre-launch blockers)
- [ ] 1. Fix contact phone and email domain inconsistency
- [ ] 2. Resolve pricing / photo-limit inconsistency
- [ ] 3. Add real or seeded listings
- [ ] 4. Add visible seller onboarding page
- [ ] 5. Add real business directory listings
- [ ] 6. Fix "Loading…" pages for SEO and trust (SSR fallback content)
- [ ] 7. Clarify export page liability conflict
- [ ] 8. Add trust / verification explainer page
- [ ] 9. Add scam-report and buyer-safety workflows
- [ ] 10. Add affiliate products to Shop

### Then build monetization
- [ ] Boosted listings
- [ ] Dealer subscriptions
- [ ] Business directory paid profiles
- [ ] Sponsored ad placements
- [ ] Inspection referrals
- [ ] Parts / tool affiliate shop
- [ ] Learn / course sponsorships
- [ ] Export lead referral (not direct brokerage unless legally structured)
- [ ] Buyer "wanted" posts
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
