# Phase 2 — Admin-Guard Sweep

Goal: every sensitive server function enforces admin role server-side via the existing `requireAdminRole` middleware, replacing weaker `requireSupabaseAuth`-only protection and removing ad-hoc inline role checks.

## Scope (audit results)

Three classes of fixes:

### A. Swap `requireSupabaseAuth` → `requireAdminRole`

Functions that are admin-only but currently only check "is logged in":

**`src/lib/shop.functions.ts`** (16 fns, lines 478–824)
- `adminListProducts`, `adminUpsertProduct`, `adminDeleteProduct`
- `adminListNetworks`, `adminUpsertNetwork`
- `adminUpsertLink`, `adminDeleteLink`, `adminProductLinks`
- `adminListFitment`, `adminUpsertFitment`, `adminDeleteFitment`
- plus the 3 remaining admin fns at 707/719/735 and the scrape fn at 824

**`src/lib/education.functions.ts`** (12 admin fns at 520–789)
- `adminUpsertCourse`, `adminListCourses`, `adminDeleteCourse`, `adminGetCourseFull`
- `adminUpsertModule`, `adminDeleteModule`
- `adminUpsertLesson`, `adminDeleteLesson`
- `adminListPartners`, `adminUpsertPartner`, `adminDeletePartner`
- the partner-link fn at 789

### B. Replace inline role checks with `requireAdminRole`

Same effect, less duplication, single audit point:

- `src/lib/admin-users.functions.ts` — `searchTransferableUsers` (inline `.eq('role','admin')`)
- `src/lib/places.functions.ts` — the 2 admin-only fns at lines 44 and 119
- `src/utils/payments.functions.ts` — `verifyStripePlans` (line 347) and the admin branch at 610 (replace inline `rpc('has_role')` with middleware)

### C. Leave as-is (user-owned, not admin)

Confirmed not in scope — these correctly use `requireSupabaseAuth` because the row-owner check is performed inside the handler (RLS + `user_id = userId` filter):
- `deleteVehicle`, `deleteServiceRecord`, `deleteRide`, `deleteAd`
- `deleteBusiness*`, `updateInquiryStatus`, `updateLeadStatus`, `updateBookingStatus`
- `deleteGallery*`, `deleteContactChannel`, `deleteBookableItem`, `deleteException`
- `verifyCertificate` (public verify endpoint by design)

## Implementation

For each function in groups A and B:

1. Add import (once per file): `import { requireAdminRole } from "@/integrations/supabase/admin-middleware";`
2. Change `.middleware([requireSupabaseAuth])` → `.middleware([requireAdminRole])`
3. For group B: delete the inline `roleRow` / `rpc('has_role')` block — middleware already enforces it before the handler runs.
4. Keep `requireSupabaseAuth` import only if other (non-admin) fns in the same file still use it.

`requireAdminRole` already composes `requireSupabaseAuth`, so `context.userId` and `context.supabase` remain available to handlers — no handler body changes besides removing the now-redundant inline checks in group B.

## Verification

1. Build passes (typecheck + Vite).
2. `supabase--linter` clean.
3. Manual smoke as a non-admin authenticated user: each touched fn returns 403 (instead of 200/empty).
4. Manual smoke as admin: each touched fn still returns expected data.

## Out of scope (handled in later phases)

- Stripe retry/`alertOps` hardening (Phase 1 leftover)
- SEO `head()` sweep, error/notFound boundaries (Phase 2 SEO track)
- PWA / a11y / tests (Phase 3)
