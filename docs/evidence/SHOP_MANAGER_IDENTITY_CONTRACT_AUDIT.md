# Native Shop Manager identity contract: unresolved release gate

Updated 2026-10-15 Asia/Manila. Bounded source review plus read-only catalog checks
at 2026-10-14 17:38 UTC. No customer/profile rows read or modified; no live
function invoked. This does not approve a tenant contract or prove an API exploit.

## Distinct identities

| Identity                | Existing link / authority                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Auth actor              | Verified JWT sub through auth middleware                                                   |
| Public profile          | `public.profiles.id = auth user id`                                                        |
| Native employee profile | `shop_manager.profiles.id`; nullable `user_id` links auth; legacy IDs can differ           |
| Operational shop        | `shop_manager.shops.id`, selected by native profile `shop_id`                              |
| Public business         | Explicit `shops.business_id -> businesses.id`; owner or active `business_staff` membership |
| Public organization     | `businesses.organization_id -> organizations.id`, separate membership authority            |
| Associate eligibility   | Approved/enabled/non-offboarded application and active business; not employee identity     |

The staff bridge sets `shops.organization_id = businesses.id`, not the public
organization ID. Never use that column to infer organization membership. The
frontend has no verified explicit active-shop switch; a business URL or clock-in
work-location selector does not establish one.

## Current authority-integrity concern

Live catalog confirms native profiles have RLS enabled (not forced), and the
authenticated role has effective table INSERT/UPDATE and `shop_id` column
INSERT/UPDATE rights. Its self INSERT/UPDATE policies check only
`id = auth.uid() OR user_id = auth.uid()`, with no shop-membership constraint.
No non-internal profile triggers were present in the catalog inspection.
No profile mutation was attempted. This is an observed mutable-tenant-binding
release risk, not a claim of executed cross-shop access.

A follow-up read-only definition check also confirmed the live zero-argument
current-shop helper returns `profiles.shop_id WHERE id = auth.uid() LIMIT 1`,
with no independent membership predicate (definition MD5
`be63946995c909e4a224b0e4989eaaf7`). This catalog identifier is not migration
provenance or permission to change the live helper.

The current-shop helper uses `profiles.id = auth.uid()`, whereas the employee
resolver accepts `user_id OR id` and prefers user_id. Bridge upserts preserve
legacy row IDs, so module and shop resolution can disagree. `ensure_profile_for`
is not invoked by the inspected frontend/helper chain despite its bootstrap
comment, and assigns an owned business ID directly to profile.shop_id rather
than the newer generated shop ID. A single native profile per user also cannot
represent implemented multi-shop switching by itself.

Module visibility is not a granular invoice-create contract. The resolver accepts
view/read/manage actions; privileged native roles return all modules before
overrides. The `user_has_permission` stub ignores the requested action. Do not
silently promote these predicates to fine-grained write authorization.

## Required next tests and decisions

- Build disposable fixtures for direct profile shop/role/module tampering and
  active/revoked business membership, with real role grants/RLS and no admin client.
- For linked shops, validate membership independently through the explicit
  business bridge, not through self-editable profile fields. Establish how legacy
  unlinked shops are authorized; never infer linkage from email, VIN or names.
- Define whether a native profile selects one operational shop or an explicit
  membership-aware active-shop model is required. Test differing legacy IDs and
  membership changes; keep account and shop/organization cache scope separate.
- Before atomic invoice conversion, require authenticated actor, trusted shop
  membership, matching work-order/customer/vehicle ownership, explicit invoice
  write authority, authoritative line data and existing database authorization.
  A service-role client is not an authorization fallback.
- Receipt access additionally requires its Vehicles module/eligible-role checks,
  active approved links and per-receipt sharing. Customer visibility alone does
  not grant owner receipt access.

No live privilege change or identity backfill is included. Apply any eventual
forward correction only after provenance, compatibility, recovery and release
approval gates. Preserve applied historical migrations.

## Source pointers

- `src/integrations/supabase/auth-middleware.ts`: actor verification.
- `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql`: current-shop helper.
- `20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql`: profile policies,
  shop/customer/invoice RLS and bootstrap helper.
- `20260831124952_employee_operations_ledger.sql`: employee resolver.
- `20260901025637_add_driver_module_access.sql`: module resolver.
- `20260902151438_assistant_manager_temporary_canonical_permission.sql`: bridge.
- `20261014043336_vehicle_receipts_shared_history.sql`: distinct receipt access.

Migration pointers are under `supabase/migrations/`. Source correspondence does
not replace the fresh catalog observations or establish full deployed parity.

## Disposable proof checkpoint

`scripts/ci/shop-manager-profile-authority.test.mjs` passes six tests using five
sequential memory-only PGlite databases and hash-pinned original SQL. Ordinary
authenticated roles first see only their own customers, then a self-profile shop
UPDATE or self INSERT changes the current-shop helper and exposes the other
synthetic shop despite no fixture membership. Legacy id/user_id resolver mismatch
is reproduced. A fixture-only column-grant contrast blocks both pivots while
allowing a display-name edit. Test/statement/lock waiting is bounded, and every
database closes. These are retained-source behavior proofs, not live exploitation
or approval of a production profile-policy fix.
