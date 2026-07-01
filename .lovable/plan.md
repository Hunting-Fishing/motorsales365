# 365 Partner Program — new page + light enhancements

Keep `/advertise` untouched (paid exposure remains a separate product). Create a brand-new partner program with its own route, terms, application flow, and compliance guardrails. Existing "Advertiser" employee dashboards keep everything they currently show — we just enhance them with partner-program-specific data.

## 1. New public route: `/partner-program`

File: `src/routes/partner-program.tsx`

Sections (single scrolling page, PH-first tone, matches existing SiteLayout):

1. **Hero** — "365 Partner Program. Earn referral commissions by promoting 365 Motor Sales with your QR code, referral link, or content." CTA: "Apply to become a Partner".
2. **How it works** — 3 cards: Get your QR/link → Share it your way → Earn on real conversions.
3. **What you earn** (commission-only, no wage-like pay) — table of qualifying events:
   - Paid seller subscription
   - Paid boost / promoted listing
   - Verified business signup
   - Advertiser / sponsor purchase
   - Shop purchase (where enabled)
   - Commissions clear after the refund/chargeback window.
4. **What you can and cannot do** — two-column "Allowed / Not allowed" list mirroring the brief (no cash collection, no impersonating staff, no MLM/downline, no misleading income claims, mandatory disclosure on paid posts, etc.).
5. **Swag & branding rules** — approved wording ("365 Motor Sales Partner. Scan my QR to list, sell, or promote your vehicle."), forbidden wording ("Staff / Agent / Employee / Authorized Representative"). Optional shirts/stickers/decals are not a uniform.
6. **Disclosure snippets** — copy-to-clipboard blocks: `I may earn a commission if you sign up through my 365 Motor Sales link.` + hashtags (`#365MotorSalesPartner #Affiliate #PaidPartner #CommissionLink`).
7. **Data privacy** — QR always routes to a 365 landing page; partners never handle IDs, payments, or customer PII; dashboards show only aggregated metrics + commission line items.
8. **FAQ** — employee vs partner, payout timing, refund clawbacks, taxes are the partner's responsibility, no downline/MLM.
9. **Apply CTA** — links to the application form (below).
10. **Legal footer link** — link to `/partner-program/terms`.

Head metadata: unique title + description + og:title + og:description (per route-architecture rules). No og:image unless a hero asset exists.

## 2. Legal terms page: `/partner-program/terms`

File: `src/routes/partner-program.terms.tsx`

Static markdown-style page with the independent-contractor language from the brief, aligned with existing `/terms` tone (short paragraphs, "Last updated" date). Covers: independent-contractor status, no employment/agency/franchise, commission-only pay, no schedule/location/quota control, brand-safety rules, prohibited conduct, disclosure duty (FTC/CCB), no downline, DPA-compliant data handling, ITA marketplace compliance, refund/chargeback clawback, termination for cause, PH governing law.

Per `mem://policies/terms-sync`: this is a new standalone terms page for a new product surface — cross-link from `/terms` in a short "Related policies" note and bump `/terms` "Last updated" if we reference the partner program there. Also mention data handling in `/privacy` and bump its date (per `mem://policies/privacy-sync`).

## 3. Application flow: `/partner-program/apply`

File: `src/routes/partner-program.apply.tsx`

Public form (works signed-out; if signed in, pre-fills). Fields:
- Full name, email, phone (PH), city/region
- Channel type: individual creator / influencer / shop / community / other
- Primary platforms (multi-select: TikTok, FB, IG, YouTube, in-person, blog, other)
- Audience size (rough band)
- Short pitch (max 500 chars)
- Checkbox: "I have read and agree to the Partner Program Terms" (links to /partner-program/terms)
- Checkbox: "I understand I am an independent partner and not a 365 employee"

Server function `submitPartnerApplication` in `src/lib/partner-program.functions.ts` writes to a new table `partner_program_applications` with status `pending`. Reuse the pattern of `submitPartnerApplication` in `src/lib/partner-applications.functions.ts` (which is for B2B parts suppliers — keep it separate).

## 4. Database (Lovable Cloud)

Migration creates:

- `partner_program_applications` — id, user_id (nullable), full_name, email, phone, city, region, channel_type, platforms text[], audience_band, pitch, status (pending/approved/rejected), admin_notes, reviewer_id, reviewed_at, created_at.
- `partner_program_partners` — approved partners: id, user_id (nullable until they sign up), referral_code (unique), display_name, active, agreed_terms_at, agreed_terms_version, payout_method, created_at.
- `partner_program_commission_events` — event_id, partner_id, event_type (`seller_sub`, `boost`, `verified_business`, `advertiser_purchase`, `shop_purchase`), amount_php, commission_php, status (`pending`, `approved`, `clawed_back`, `paid`), source_ref (order/subscription id), event_at, cleared_at.

All tables: `GRANT` block for `authenticated` + `service_role`, RLS enabled, policies scoped to `auth.uid()` for partner self-reads, admin-only writes via `has_role`. Anon `INSERT` only on `partner_program_applications` (public application form).

## 5. Partner dashboard: `/dashboard/partner-program`

For approved partners (any account type — not staff-only). Shows:
- Unique QR + referral link (reuse existing QR generation pattern from `dashboard.referral.tsx`)
- Metrics: clicks, signups, paid conversions, pending commissions, approved commissions, clawbacks, payout history
- Commission event list

Reads-only view of `partner_program_commission_events`. No customer PII displayed — event rows show event type + amount + status only.

## 6. Enhance existing employee "Advertiser" dashboard

The existing employee Advertiser dashboard (currently at `/dashboard/referral` for 365 staff) keeps everything it already shows. We add:
- A "Partner Program" tab that surfaces the same commission/click metrics if the employee also has a partner referral code assigned, plus a link to the public `/partner-program` page and admin approvals queue if `has_role('admin')`.
- Small badge "Employee · not covered by Partner Program terms" so it's clear staff commissions follow employment terms, not partner terms.

No other changes to the existing advertiser employee data or layout.

## 7. Admin: `/admin/partner-program`

- Applications queue (approve / reject / notes)
- Approved partners list (activate / deactivate / regenerate code)
- Commission events with filters + a "clear pending" batch action after refund window
- Export CSV

Uses `requireSupabaseAuth` + `has_role('admin')`.

## 8. Compliance guardrails baked into copy

- Every earning claim uses "may earn" / "when qualified users sign up or purchase" — never "guaranteed / passive / everyone gets paid / investment".
- No downline / recruitment commissions anywhere in schema or UI.
- Disclosure snippets always visible on the partner dashboard.
- Application form + terms explicitly state: independent contractor, no schedule/location/quota control, no cash collection, no impersonating staff.

## Technical notes

- Routes: `partner-program.tsx`, `partner-program.terms.tsx`, `partner-program.apply.tsx`, `dashboard.partner-program.tsx`, `admin.partner-program.tsx` (all TanStack file-based).
- Server functions in `src/lib/partner-program.functions.ts`; admin ops gated by `has_role`.
- Reuse existing QR component pattern from `dashboard.referral.tsx` (`QRCodeCanvas`) rather than duplicating.
- All new tables get `GRANT` + RLS + policies in the same migration (per public-schema-grants rule).
- Update `mem://index.md` Core with a one-liner: "Partner Program is commission-only, no downline, independent-contractor terms at /partner-program/terms." Save a memory file `mem://features/partner-program` with the compliance rules so future edits don't reintroduce wage-like language or MLM patterns.
- Bump "Last updated" on `/terms` and `/privacy` and add short cross-links.

## Out of scope (for this pass)

- Automatic payout processing (GCash/Maya/bank rails) — surface amounts and mark manually paid for now.
- Downline / multi-tier commissions — explicitly excluded by design.
- Anything that changes `/advertise` behavior — that page stays exactly as-is.
