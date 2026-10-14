# Vehicle receipts and shared history

Branch: `feature/vehicle-receipts-history`. Base: `c8b66ebd9eecfd5b76c385c4442e1282d27bd9ac`.

This branch adds a reviewed purchase-to-installation workflow across My Vehicles,
Follow My Ride, Shop Manager and the 365 Parts vehicle selector. It does not merge
unrelated open PRs or deploy a database migration to production.

## Implemented workflow

1. Create/select an owned vehicle, including motorcycles and scooters.
2. Add a JPG/PNG/WebP/PDF receipt (10 MB maximum), or enter purchases manually.
3. Optionally consent to sending the file to the configured vision provider.
4. Review each description, category and quantity. Uncertain fields remain unset;
   high confidence does not substitute for a human review. AI never marks an item
   installed or verifies fitment.
5. Save a draft or confirm the purchases with a purchase date and currency.
6. Record installation separately with date and optional odometer. Confirmed
   purchases and installations become deduplicated, labeled history events.
7. Filter receipt items by Suspension, Brakes, Electrical, Fuel, Engine,
   Drivetrain, Cooling, Exhaust, Wheels & tires, Body, Interior, Fluids,
   Accessories, Labor or Miscellaneous.
8. Connect a Follow My Ride page to the same owned vehicle. History is shared,
   rather than copied into another editable receipt database.
9. A shop creates a connection code; the owner explicitly approves it from My
   Vehicles. Matching populated VIN/chassis values are required. Do not infer
   identity from make/model or a shared plate alone.
10. Shop receipts and associate installed components become visible in the owner
    ledger after linking. Original personal receipts remain private unless shared.
    Owners can revoke shop access and opt individual summaries into public pages.
11. Shop managers can record a confirmed PHP receipt total in Expenses exactly
    once. Other currencies must be handled through the shop's accounting process.
12. “Use for 365 Parts” selects the owned vehicle as the fitment garage vehicle.
    The garage remains a *current selection*; My Vehicles is the multi-vehicle list.

The new receipt surface is accessible from `/dashboard/vehicles`, the
`Receipts & history` tab in a ride editor, `/workspace/vehicles/:id`, and the
vehicle selector on `/workspace/expenses`.

## Security and identity

- Private buckets: `vehicle-receipts` and `vehicle-service-receipts`.
- Original receipts never appear in public passport/history projections.
- Public raw service-record access is removed; the passport server returns an
  explicit projection without receipt links or storage paths.
- Receipt writes are RPC-only. Public functions are SECURITY INVOKER wrappers;
  authenticated private implementations check ownership/employee access.
- Shop access requires the Vehicles module and a manager/parts manager/service
  advisor/office admin role. Read-only owner-shared receipts cannot be edited.
- Receipt sharing and public summary sharing are distinct.
- A shop retains its own receipts after a link is revoked; revocation removes its
  access to the owner's shared personal receipts. Existing contributed owner
  history is retained.
- Owner-recorded installations of shop-purchased parts are owner-entered events,
  not falsely labeled shop-attested installations.
- The scan budget is atomic and persisted: at most 30 attempts per user/day.
- New ride/garage links enforce common ownership even on direct table updates.
- Dates are ISO calendar dates; purchase and installation are separate. Future
  or pre-purchase installations are rejected. PH calendar dates use Asia/Manila.
- Existing service entries are backfilled into the owner ledger. New service
  inserts/updates synchronize; deleting a service entry suppresses its public
  summary and retains a labeled history entry.

## Activation order

1. Review the branch and PR. Deploy against a staging database first.
2. Apply `20261014043336_vehicle_receipts_shared_history.sql`. Ensure both new
   public tables/RPCs are exposed through the project's Data API settings and
   `shop_manager` remains exposed as required by existing Shop Manager routes.
   SQL explicitly grants authenticated access and enables RLS.
3. Migrate old service receipt originals with the utility below. It preserves
   owner access during the transition. Removing links from the public API alone
   does not make already-public originals private.
4. Set **server-side** receipt AI configuration:
   - `RECEIPT_AI_API_KEY` (or existing `AI_API_KEY`)
   - `RECEIPT_AI_BASE_URL` (or existing `AI_BASE_URL`): OpenAI-compatible endpoint
   - `RECEIPT_AI_MODEL`: explicit vision model supporting images and, if used, PDFs
   This module creates no new Lovable gateway dependency. No provider is assumed
   to support PDFs solely because it supports images. Do not expose these secrets
   with a `VITE_` prefix. Manual entry works without a configured AI provider.
5. Deploy application code. Test real owner and staff accounts, phone uploads,
   JPG/PDF extraction with the configured provider, review, confirmation, later
   installation, revocation and a public ride/passport.
6. Run live Supabase security/performance advisors and check storage access with
   an unrelated account. Verify provider quotas/billing before enabling scans.

### Legacy receipt migration

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` privately in your shell.
Never commit or paste their values into issue/PR descriptions.

```bash
npm run receipts:migrate-legacy             # Read-only inventory
APPLY=1 npm run receipts:migrate-legacy     # Copy, verify, update, remove public original
```

The utility only migrates recognized receipt paths under the current Supabase
origin and `vehicle-media/<owner>/receipts/<vehicle>/`. It reports unsupported
URLs with exit code 2; resolve these separately. It does not fetch arbitrary URLs.
It is retryable after a private copy or database update succeeds but cleanup fails.
Public photos remain public. Previously cached/downloaded copies cannot be recalled.

## Validation

- `npm run test:vehicle-receipts:db`: isolated PostgreSQL/PGlite fixture; applies
  the migration and exercises actual RLS and RPCs, not string-matching tests.
- `npx vitest run src/lib/vehicle-receipts.test.ts src/components/vehicle-receipt-panel.test.tsx`:
  untrusted AI output, manual correction/review, file limits and unavailable-AI fallback.
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- `npm run build`.

Full-suite baseline comparison uses the same test dependencies on untouched main.
Results and remaining failures are recorded in the PR. Database fixture checks
cannot substitute for a live provider extraction or the deployed project's
storage/Data API configuration.

## Branch synchronization performed before this build

All 11 non-main branches were brought up to date with the base main commit using
fast-forward or a two-parent merge, without force pushes. Original branch commits
remain in history. Conflicting legacy auth/client/build/migration-chunk files on
`migration/standalone-supabase-365` and the two `tmp-google-auth-probe` branches use
current main. The conflicting earlier parts plan is retained separately as
`docs/history/365_PARTS_PARTNER_NETWORK_PLAN_BRANCH_ARCHIVE.md` on its planning branch.
No unrelated PR was merged into main.

## Boundaries

This is 365-generated evidence, not official government/insurance history or a
licensed CARFAX feed. External data partnerships remain separate work.
A receipt item records its purchased quantity as one line; an installation records
that line as installed. Split purchases into distinct lines before confirmation
when they need different installation dates. Confirmed evidence is immutable;
formal correction workflows and ownership-transfer document permissions need a
separate implementation before broad history-report rollout. Shop linking currently
uses the existing customer-linked Shop Manager vehicle access model; unassigned
company assets must first have a supported shop/customer identity.
