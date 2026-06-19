## Goal

Add a self-serve "Claim a Business" entry point in the user dashboard so a signed-in user can search the business directory, then either claim an unclaimed listing or request an ownership transfer for a claimed one. All routes terminate at the existing admin review queue.

## What already exists (reused, not rebuilt)

- `business_claim_requests`, `business_claim_evidence`, `business_claim_audit` tables + RLS.
- `submitBusinessClaim` server fn, `ClaimCta` dialog, `EvidenceUploader` (storage bucket `claim-evidence`).
- Admin review UI at `/admin/claims` with approve / approve & transfer.
- Per-business claim CTA already on `/businesses/$slug`.

The gap: there is no place to search/claim from the dashboard, and no formal "transfer request" path when a business is already owned by someone else.

## New flow

### 1. New route `/dashboard/claim-business`
- Added as a tab in the dashboard Account sub-nav next to Profile / Verification / Billing.
- Search box (debounced) → calls a new public server fn `searchClaimableBusinesses({ q })` returning `{ id, slug, name, logo_url, city, region, claim_state, owner_id }` (publishable-key client, no PII).
- Results list shows each business with a status badge and a single action button:
  - `unclaimed` / `claim_pending` (no owner) → "Claim this business" → opens existing `ClaimCta` dialog.
  - `owned` → "Request ownership transfer" → opens a new `TransferRequestDialog`.
- Below the search: "My claim & transfer requests" list (status + reviewer notes) using existing data.

### 2. Transfer-request submission
- New server fn `submitOwnershipTransferRequest` in `src/lib/business-claims.functions.ts`:
  - Inputs: `businessId`, `reason` (required, 20–2000 chars), `contactMethod` (`email|phone|document`), `contactValue?`.
  - Inserts into `business_claim_requests` with a new `kind = 'transfer'` column (default `'claim'` for existing rows). Never auto-approves.
  - Requires at least one evidence file uploaded to `claim-evidence` and linked via `business_claim_evidence` before submit is enabled (client-side gate, server re-checks count ≥ 1).
- Migration:
  - `ALTER TABLE business_claim_requests ADD COLUMN kind text NOT NULL DEFAULT 'claim' CHECK (kind IN ('claim','transfer'))`.
  - Update the INSERT policy so transfer rows are allowed against owned businesses (`kind='transfer' AND owner_id IS NOT NULL`) while the existing claim path keeps its `unclaimed / claim_pending` restriction.
  - Index on `(kind, status)` for the admin queue.

### 3. Admin queue updates (`/admin/claims`)
- New "Type" filter (Claim / Transfer / All) and a `kind` badge per row.
- For `kind='transfer'`:
  - Show current owner (name + id) and the requester side-by-side.
  - "Approve & transfer" button reuses the existing `approve_business_claim` RPC path (already sets `owner_id`), so approving a transfer reassigns ownership atomically and writes a `business_claim_audit` row noting the previous owner.
  - "Reject" works unchanged.

### 4. Document requirement
- Evidence-required policy enforced in `submitBusinessClaim` and `submitOwnershipTransferRequest` (server count check ≥ 1 from `business_claim_evidence` for the new claim id) — covers both flows from this new dashboard entry. Existing per-business CTA inherits the same rule.

## Out of scope

- No changes to `/businesses/$slug` claim card (it keeps working as-is).
- No notifications/email templates beyond what `business_claim_audit` already produces.
- No bulk transfer tooling.

## Files touched

- New: `src/routes/_authenticated/dashboard.claim-business.tsx`, `src/components/business-page/transfer-request-dialog.tsx`.
- Edit: `src/lib/business-claims.functions.ts` (add search + transfer fn + evidence gate), `src/routes/admin.claims.tsx` (kind badge, filter, owner column), `src/routes/dashboard.tsx` (sub-nav link).
- Migration: `business_claim_requests.kind` + updated INSERT policy + index.
