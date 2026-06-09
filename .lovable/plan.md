# Plan — Audit #9: PH Payments Expansion + Admin Control

Reuses what's already in the repo (no duplicates): `payments` table + `method` column, `payment_line_items`, `feature_flags.payments.*`, `src/lib/payments/provider.ts` rail registry, `admin.pricing.tsx`, public `/payments` page, `payments.$id.receipt.tsx`, and the existing Stripe checkout flow. No new payment SDKs (PayMongo/Xendit require user keys — left as already-registered rails behind feature flags).

## Scope (from audit)
Maya, QR Ph, manual upload, GCash backup, PayPal, invoice/receipt download, "Pay with GCash" guide.

## 1. Schema (single migration)
Add to `public.payments`:
- `proof_url text` — uploaded receipt image/PDF
- `proof_uploaded_at timestamptz`
- `reviewed_by uuid` (FK profiles), `reviewed_at timestamptz`, `review_notes text`
- `invoice_number text unique` — auto-generated `INV-YYYYMM-#####`

New table `public.payment_method_config` (admin-controlled per-method metadata):
- `method text PK` (e.g. `gcash_manual`, `maya_manual`, `qrph`, `bank_transfer`, `paypal_manual`, `stripe`)
- `enabled bool`, `label text`, `instructions_md text`, `account_name text`, `account_number text`, `qr_image_url text`, `sort_order int`, `is_manual bool`
- RLS: public read where `enabled=true`; admin full write. Standard GRANTs.

Create storage bucket `payment-proofs` (private) — buyer uploads, admin reads.

## 2. Server functions (`src/lib/payments-manual.functions.ts`)
- `listPaymentMethods()` — public, returns enabled methods for checkout picker.
- `submitManualPayment({ kind, refId, method, amount_php, reference, proof_path })` — auth'd, inserts pending `payments` row, generates `invoice_number`.
- `adminListPendingPayments()`, `adminApprovePayment(id, notes)`, `adminRejectPayment(id, notes)` — admin-only; on approve, calls existing activation paths (listing publish, boost activation, subscription extend) based on `kind`.
- `getInvoicePdf(paymentId)` — auth'd (owner or admin); renders HTML invoice server-side and returns a PDF blob (use `@react-pdf/renderer` already? check; else generate printable HTML route).

## 3. Admin: single new route `/admin/payments` (no duplicate of admin.pricing)
Tabs:
1. **Methods** — table of `payment_method_config`: toggle enabled, edit instructions, upload QR image, reorder.
2. **Rails** — toggles for `feature_flags.payments.stripe|paymongo|xendit` (reuses existing flag system).
3. **Pending Review** — queue of manual payments with proof preview, approve/reject.
4. **All Payments** — searchable history with status/method filters, link to invoice PDF.

Add nav link in `admin.tsx`. Leave `admin.pricing.tsx` focused on plan pricing/Stripe verification (no overlap).

## 4. Checkout integration
Update the 4 existing checkout routes (`listing.checkout`, `boost.checkout`, `business.checkout`, `passport-premium.checkout`) to render a **method picker** sourced from `listPaymentMethods()`:
- Stripe selected → existing embedded checkout (unchanged).
- Manual method selected → instructions panel (markdown + QR image) + reference field + proof uploader → calls `submitManualPayment` → redirects to `/payments` dashboard with "pending review" toast.

## 5. Invoice / receipt download
- Extend `payments.$id.receipt.tsx` with a "Download PDF" button calling `getInvoicePdf`.
- Add a new `/dashboard/billing` link to per-payment receipt (already exists, just wire download).

## 6. Public "Pay with GCash" guide
New route `/help/pay-with-gcash` — step-by-step (open GCash → scan QR / send to number → enter reference → upload proof on 365). Linked from `/payments` page and from the manual-method instructions panel.

## 7. Seed `payment_method_config`
Insert rows for: `stripe` (managed), `gcash_manual`, `maya_manual`, `qrph` (uses same QR image field), `bank_transfer`, `paypal_manual`. Defaults: stripe enabled, GCash enabled, others disabled — admin turns on after filling account details.

## 8. Terms / privacy bump
- `/terms` — add manual-payment / proof-of-payment / refund timing for manual methods + bump date.
- `/privacy` — note proof-of-payment image retention + bump date.

## Files
- New: migration, `src/lib/payments-manual.functions.ts`, `src/routes/admin.payments.tsx`, `src/routes/help.pay-with-gcash.tsx`, `src/components/checkout/method-picker.tsx`, `src/components/checkout/manual-pay-form.tsx`, `src/components/admin/payment-method-editor.tsx`.
- Edited: 4 checkout routes, `src/routes/payments.$id.receipt.tsx`, `src/routes/payments.tsx` (sync method labels from DB), `src/routes/admin.tsx` (nav), `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/integrations/supabase/types.ts` (auto).

## Out of scope (deferred, explicit)
- Live PayMongo / Xendit SDK integration (needs user-supplied API keys; rails stay flag-gated).
- Automated GCash API (no public PH consumer API; manual + proof is the standard pattern).
- Stripe go-live (separate flow).

Approve to proceed.
