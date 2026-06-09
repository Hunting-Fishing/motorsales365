# Full Manual Payment Status Workflow

Today the admin flow is binary: a pending manual payment jumps straight to `paid` or `failed` on a single click. We'll add an explicit **Pending → Reviewed → Approved/Rejected** lifecycle with timestamps, reviewer notes, and an audit trail — all controlled from the existing `/admin/payments` page.

## Stages

```text
submitted  →  pending      (auto on submit; proof uploaded)
pending    →  in_review    (admin claims it, optional note)
in_review  →  approved     (status=paid, side-effects fire)
in_review  →  rejected     (status=failed, reason required)
in_review  →  pending      (release back to queue)
approved   →  refunded     (existing flow, unchanged)
```

A reviewer must move a payment into `in_review` before approving or rejecting — this prevents two admins acting on the same row and forces a deliberate review step.

## Database (single migration)

1. Extend `payment_status` enum: add `in_review`, `approved`, `rejected`. Keep `paid`/`failed` as terminal aliases used by side-effects so existing code (boost activation, subscription renewal, receipts) keeps working.
2. Add columns to `public.payments`:
   - `review_started_at timestamptz`
   - `review_started_by uuid references profiles(id)`
   - `approved_at timestamptz`
   - `rejected_at timestamptz`
   - `rejection_reason text`
3. New table `public.payment_review_events` (full audit log):
   - `payment_id`, `actor_id`, `from_status`, `to_status`, `note`, `created_at`
   - GRANTs + RLS: admins manage; owner of payment can SELECT their own events.
4. Trigger `tg_payment_status_audit` on `payments` — inserts a row in `payment_review_events` on every status transition (captures `auth.uid()`).
5. Update the "Users insert own payments" RLS check to include the new statuses in the forbidden-on-insert list (still forces `pending`).

## Server functions (`src/lib/payments-manual.functions.ts`)

Reuse existing admin guard. Replace the two-call API with the staged workflow:

- `adminClaimPaymentReview({ id, note? })` — pending → in_review, stamps `review_started_at/by`.
- `adminReleasePaymentReview({ id, note? })` — in_review → pending (only if claimed by same admin or admin override).
- `adminApprovePayment({ id, notes? })` — in_review → approved (also sets `status=paid`, `paid_at`, `approved_at`, `reviewed_by/at`). Keeps current downstream activation calls.
- `adminRejectPayment({ id, reason })` — in_review → rejected (also sets `status=failed`, `rejected_at`, `rejection_reason`, `reviewed_by/at`). Reason required, min 5 chars.
- `adminListPayments({ status?, method?, q?, limit })` — unified list replacing `adminListPendingPayments`, supports filtering by any stage and free-text search on reference/invoice/user.
- `adminGetPaymentDetail({ id })` — returns payment + profile + line items + full `payment_review_events` timeline + signed `proof_url`.

## Admin UI (`src/routes/admin.payments.tsx`)

Reuse the existing 4 tabs; rebuild the **Pending Review** + **All Payments** tabs around the new state machine:

- **Queue tab**: three columns/sub-tabs — *Pending*, *In Review (mine)*, *In Review (others)*. Each row shows amount, method, user, invoice #, age. Primary action depends on stage:
  - Pending → "Start review" (claim)
  - In Review (mine) → "Approve" / "Reject" / "Release back"
  - In Review (others) → read-only with reviewer name
- **Detail drawer** (opens from any row): proof preview, line items, full timeline of `payment_review_events`, reviewer notes thread, action buttons gated by current stage. Approval modal has optional internal note; rejection modal requires a reason (saved to `rejection_reason` + audit).
- **All Payments tab**: filter chips for every stage (Pending, In Review, Approved, Rejected, Refunded), method filter, search box, CSV export button.

No changes to checkout, receipts, Methods tab, or Rails tab.

## Files

- `supabase/migrations/<ts>_payment_workflow.sql` (new)
- `src/lib/payments-manual.functions.ts` (edit — replace approve/reject, add claim/release/list/detail)
- `src/routes/admin.payments.tsx` (edit — Queue + Detail drawer + All Payments filters)
- `src/components/admin/payment-review-drawer.tsx` (new — detail/timeline/actions)
- `src/integrations/supabase/types.ts` (regenerated after migration)

## Out of scope

- Public-facing receipt/PDF changes (already show invoice + paid date).
- Refund workflow (separate, already exists as `refunded` terminal).
- Email notifications to the buyer on approve/reject — easy follow-up using the existing `enqueue_email` helper if you want it; say the word and I'll add it in the same pass.
