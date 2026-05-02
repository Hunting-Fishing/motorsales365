## Seller Verification Workflow

Add a verification system where repair shops, insurance providers, and businesses can submit credentials for admin review and earn a "Verified" trust badge that appears on listings and seller profiles.

### Database changes

New table `verification_requests`:
- `id`, `user_id`, `business_type` (`repair_shop` | `insurance` | `dealer` | `other`)
- `legal_name`, `dti_sec_registration` (PH business registry #), `tax_id`, `contact_phone`, `contact_email`, `address`, `region`, `city`
- `documents` (jsonb array of storage paths — DTI/SEC cert, BIR 2303, mayor's permit, ID)
- `status` (`pending` | `approved` | `rejected` | `more_info`)
- `submitted_at`, `reviewed_at`, `reviewed_by`, `review_notes`
- RLS: owner can insert/select own; admins manage all

New columns on `profiles`:
- `verification_status` (`unverified` | `pending` | `verified` | `rejected`) default `unverified`
- `verified_at` timestamptz
- `business_type` text (repair_shop, insurance, dealer, etc.)

Storage bucket `verification-docs` (private, owner + admin read via RLS).

### New routes

- `src/routes/dashboard.verification.tsx` — User-facing form. Shows current status, submission form (business type, registration numbers, document uploads), and resubmit if rejected. Sidebar entry in dashboard.
- `src/routes/admin.verifications.tsx` — Admin queue. Lists pending requests, opens detail panel with documents (signed URLs), notes field, Approve / Reject / Request More Info actions. On approve: sets `profiles.verification_status = 'verified'`, `verified_at = now()`. Added to admin sidebar.

### UI changes (trust badge)

- New `VerifiedBadge` component (`src/components/verified-badge.tsx`) — shield-check icon, blue accent, tooltip "Identity & business verified by AutoTrader PH."
- `ListingCard`: show badge next to seller_type chip when `profile.verification_status = 'verified'`. Update card query in `browse.$category.tsx`, `seller.$id.tsx`, `index.tsx`, `dashboard.favorites.tsx` to join `profiles(verification_status)`.
- `seller.$id.tsx`: show badge prominently next to display name; add a "Verified business" section with verified date + business type label.
- `listing.$id.tsx`: show badge in the seller info card.

### Admin enhancements

- `admin.index.tsx`: add "Pending verifications" stat card linking to the queue.
- `admin.users.tsx`: add manual "Mark verified / Revoke" buttons (audit logged in `review_notes`).

### Technical details

- Document uploads go to `verification-docs/{user_id}/{timestamp}-{filename}`, paths stored in `verification_requests.documents`. Admin viewer creates signed URLs (60s) via `supabase.storage.from('verification-docs').createSignedUrl`.
- Trigger on `verification_requests` update: when `status` changes to `approved`/`rejected`, sync `profiles.verification_status` + `verified_at`.
- Validation with zod: registration numbers required for `repair_shop`/`insurance`/`dealer`; at least 1 document required.
- Realtime not needed — admin queue refreshes on action.

### Out of scope (Phase 4 candidates)

- Automated DTI/SEC API lookup, email notifications on status change, verification expiry/renewal, public business directory page.

### Files

- migration: `verification_requests` table + `profiles` columns + storage bucket + RLS + sync trigger
- create: `src/components/verified-badge.tsx`, `src/routes/dashboard.verification.tsx`, `src/routes/admin.verifications.tsx`
- edit: `src/components/listing-card.tsx`, `src/routes/admin.tsx` (nav), `src/routes/admin.index.tsx`, `src/routes/admin.users.tsx`, `src/routes/dashboard.tsx` (nav), `src/routes/seller.$id.tsx`, `src/routes/listing.$id.tsx`, `src/routes/browse.$category.tsx`, `src/routes/index.tsx`, `src/routes/dashboard.favorites.tsx`
