## Goal
Make GCash the obvious, properly-wired manual payment option that lands funds directly in **GCash +63 969 606 3830**.

## 1. Seed GCash details (data insert)
Update `payment_method_config` row where `method = 'gcash'`:
- `account_name`: "365 MotorSales"
- `account_number`: "+63 969 606 3830"
- `instructions`: "Open GCash → Send Money → enter +63 969 606 3830 → send the exact amount → copy the GCash reference number → upload your receipt below. We confirm within 1 business day."
- `enabled`: true
- `display_order`: 1 (so it appears first)

(QR image can be added later from admin once you upload one.)

## 2. Promote GCash on `/payments` (src/routes/payments.tsx)
- Add a top hero card above the method grid: "Pay directly to our GCash — +63 969 606 3830" with a "Pay with GCash now" button → `/pay/manual?kind=listing` and a "How it works" link → `/help/pay-with-gcash`.
- Reorder so the GCash card sits first with a "Recommended" badge.
- Update copy to make clear: GCash via Stripe routes to our bank; **direct GCash sends to our GCash wallet instantly** and is the fastest path.

## 3. Surface GCash as a first-class choice at checkout
Touch the four checkout pages (`listing.checkout.tsx`, `boost.checkout.tsx`, `business.checkout.tsx`, `dispatch.checkout.tsx`) and `passport-premium.checkout.tsx`:
- Add a prominent "Pay with GCash (direct)" button alongside the existing Stripe/manual options, deep-linking to `/pay/manual?kind=…&ref=…&amount=…&desc=…` with GCash pre-selected.
- Listing checkout already has a GCash button (Stripe rail) — relabel that as "GCash via Stripe (card sheet)" and add the new "GCash direct to wallet" button so users understand the difference.

## 4. Pre-select GCash on the manual pay form
`src/components/checkout/manual-pay-form.tsx`: accept an optional `?method=gcash` search param and auto-select GCash in the method picker.

## 5. Admin clarity
On `/admin/payments`, the existing "GCash (Manual)" filter chip already exists — add a small header showing the seeded GCash number so admins see what buyers are paying to. Editable via existing payment-methods admin UI.

## 6. Update /terms and /privacy
Per project memory: bump "Last updated" date on `/terms` (new payment destination/account) — no policy change needed beyond noting GCash direct-to-wallet payments are processed manually.

## Files
- migration/insert: update `payment_method_config` GCash row
- edit: `src/routes/payments.tsx`, `src/routes/listing.checkout.tsx`, `src/routes/boost.checkout.tsx`, `src/routes/business.checkout.tsx`, `src/routes/dispatch.checkout.tsx`, `src/routes/passport-premium.checkout.tsx`, `src/components/checkout/manual-pay-form.tsx`, `src/routes/admin.payments.tsx`, `src/routes/terms.tsx`

## Out of scope
- Automated GCash API (GCash has no public merchant API for direct wallet-to-wallet receipts; manual + receipt approval is the correct flow).
- Changing Stripe GCash rail (kept as-is, secondary option).
