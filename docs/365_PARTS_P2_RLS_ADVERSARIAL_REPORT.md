# Parts Partner Network — P2 cross-organization RLS adversarial report

**Plan:** [`365_PARTS_PARTNER_NETWORK_PLAN.md`](./365_PARTS_PARTNER_NETWORK_PLAN.md) §8 phase `P2`, gate `G2 — tenancy and security`
**Status:** `in-build` — the suite and hardening migration are in the repository. `G2` is **not** passed until the suite has been run green against a staging copy of production and the sign-off below is recorded.
**Updated:** 2026-09-27

## 1. What P2 requires

> `P2` — Cross-organization RLS and adversarial test suite for stock, cost and PII (gate `G2`: "Cross-organization RLS and adversarial tests pass for stock, cost and PII"; blocks live partner data).

It enforces architecture rules §3.2 (single owner, derived network projection), §3.3 (opt-in, admin-approved, revocable exposure), §3.10 (no cross-schema escalation), contract steps 2–5 in §4, and the stop conditions in §11.

## 2. Deliverables

| Item | Path |
|---|---|
| Adversarial suite (rolled-back transaction, 174 assertions) | `supabase/tests/parts_network_adversarial_rls.sql` |
| Runner (staging DB, or throwaway local replay with `--local`) | `scripts/test-parts-rls-adversarial.sh` |
| Local Supabase stub for the `--local` replay (never apply to a real project) | `supabase/tests/support/local_supabase_stub.sql` |
| Hardening migration closing the findings | `supabase/migrations/20260927090000_parts_network_cross_org_rls_hardening.sql` |
| Coverage guard (every protected table must be attacked by the suite, every new Parts network table must be classified) | `src/lib/security/parts-rls-coverage.ts`, `src/__tests__/parts-network-rls-adversarial.test.ts` |
| Inquiry insert aligned with the new policies | `src/lib/network-inquiry.ts`, `src/lib/network-stock.functions.ts` |

### Personas the suite attacks with

| Persona | Represents |
|---|---|
| `anon` | Public visitor / scraper using the publishable key |
| `outsider` | Signed-in user with no business |
| `b_owner` | Competing business that also buys from supplier A |
| `sm_b` | Shop Manager user of B's shop who is **not** a business member |
| `d_owner` | Partner whose Associate record is suspended |
| `e_owner` | Partner whose network exposure was revoked |
| `a_mechanic` | Non-manager staff of the supplier |
| `admin` | Platform administrator (positive controls for review/revocation) |

Positive controls (owner reads own cost, buyer reads own order, anon sees published stock, reservation arithmetic) keep the suite from passing vacuously.

## 3. Findings (replay of `main` migrations, before the hardening migration)

The suite failed **17 of 174** assertions against the current migration history.

| ID | Severity | Finding | Plan rule / stop condition |
|---|---|---|---|
| F1 | **Critical** | `business_inventory_items` private columns (`cost`, `notes`, bin `location`, `supplier`, `markup_percentage`, …) were readable by **anon and every signed-in user** for any network-published row, and streamed to signed-in Realtime subscribers. The column-level `GRANT SELECT (…)` had no effect because both roles also held table-level `SELECT` (explicit grant to `authenticated`; Supabase default privileges for `anon`). | §4 step 3; §11 "another organization's cost … becomes visible" |
| F2 | High | The base-table network policy ignored the Associate state: stock of a suspended/offboarded partner stayed readable whenever its business row still said exposure `approved`. | §11 "network stock is published for a revoked, suspended or unverified partner" |
| F3 | High (availability) | `network_stock` joined `business_associate_applications.access_enabled/offboarded_at`, which `anon` cannot read, so **every anon query of the network view failed** with `permission denied`. All network search server functions use the anon client. | §4 step 3 |
| F4 | High | A business owner could `UPDATE businesses SET network_exposure_status = 'approved'` (and forge `network_exposure_reviewed_by/at/note`) — self-approval, bypassing admin review and the audit trail. | §3 rule 3; §5.1 |
| F5 | Medium | Inquiry inserts could be attributed to another user (`requester_user_id`), could pre-set partner lifecycle fields (`status`, `fulfilled_price`, `reserved_quantity`, …) and could target suspended partners. | §4 step 5 "silent status rewrites" |
| F6 | Low (defense in depth) | Lifecycle RPCs were executable by `anon` (they reject inside, but should not be reachable); RPC-only commercial tables still carried direct `INSERT/UPDATE/DELETE` grants (denied only because no write policy exists). | §4 steps 4–9 |
| F7 | High (availability) | `submitNetworkPartInquiry` inserted as `anon` **and** asked for the row back (`.select("id").single()`); with no anon `SELECT` policy that `RETURNING` is rejected by RLS, so network inquiries could not be submitted. Signed-in buyers were also tagged by a server-side field that RLS could not verify. | §4 step 4 |

Everything else held: cross-organization orders, lines, reservations, events, receipts, returns, warranty claims, receiving exceptions, installed components, invoices, exposure audit, customer accounts/consents and private vehicle history were invisible to every non-participant persona, and direct writes around the lifecycle RPCs were blocked.

## 4. Remediation

| Finding | Fix |
|---|---|
| F1 | `REVOKE ALL … FROM anon` on `business_inventory_items`, then `GRANT SELECT` on the projection columns only. The public network policy is now `TO anon` only; signed-in non-members no longer read other organizations' rows at all (they already browse the network through the anon-backed server functions). Members keep full access through the existing member/manager policies. |
| F2 | New `public.is_network_publishable_business(uuid)` (active business **and** admin-approved exposure **and** approved, enabled, non-offboarded Associate) gates the inventory policy, the location policy, the inquiry insert policies and `network_stock`. Items in a hidden or inactive stock location are also hidden from the base table. |
| F3 | `network_stock` recreated with identical columns, using the helper instead of joining Associate application columns. |
| F4 | `trg_guard_business_network_exposure`: outside service-role and moderator/admin contexts, reviewer fields are immutable and the status can only move to `pending` or `none` (what `request_network_exposure` does). Owners can still opt out and re-request review. |
| F5 | `npi: anyone insert` replaced by `npi: guest insert` (anon: requester must be `NULL`) and `npi: signed-in insert` (requester `NULL` or `auth.uid()`); both require lifecycle fields to start empty and a publishable partner. Anon keeps `INSERT` only. |
| F6 | Anon loses every privilege on RPC-only tables and `EXECUTE` on the lifecycle RPCs; `authenticated` keeps `SELECT` only on those tables. |
| F7 | Guests insert with a server-generated id and no `RETURNING`; signed-in buyers insert with their own session so RLS binds `requester_user_id = auth.uid()`. |

After the migration the suite passes **174 / 174** on a local replay.

### Behaviour changes to be aware of

- Signed-in users querying `network_stock` or `business_inventory_items` directly now see only their own organization's rows. No app code did this; all network search goes through anon-backed server functions.
- The `/parts/network` Realtime channel now delivers only the viewer's own organization's changes to signed-in users (that channel previously leaked full rows, including cost). The page polls every 60 s as the cross-partner fallback; anonymous visitors still receive Realtime events restricted to the granted columns.
- Moderators (not only admins) can still change exposure directly, as they already could through the "Moderators manage businesses" policy.

## 5. How to run

```bash
# Throwaway local replay (needs a local Postgres 15+ superuser via PG* env vars)
./scripts/test-parts-rls-adversarial.sh --local

# Against a disposable staging database (postgres / service-role connection)
DATABASE_URL=postgres://… ./scripts/test-parts-rls-adversarial.sh
```

The suite creates synthetic fixtures inside one transaction and always ends in `ROLLBACK`. It prints a PASS/FAIL table and exits non-zero on any failure.

**Local replay caveat:** the repository's migration history does not recreate every production object (for example `organizations`, `business_services`, `business_bookings`, `staff_dms` were created outside it), so ~47 unrelated migrations fail to replay locally. All Parts network objects replay; the suite's positive controls would fail if one did not. This is why `G2` needs a staging run.

## 6. Residual risks and follow-ups (not fixed here)

| Item | Why not here | Suggested owner |
|---|---|---|
| `businesses` is publicly readable with table-level `SELECT`, which also exposes `network_exposure_review_note`, `network_exposure_reviewed_by` and `custom_domain_verify_token`. | Column-level revocation would break every `select("*")` on public business pages; needs a public projection view first. | Platform security |
| Any active staff role (mechanic, driver, clerk) of a business can read its own inventory cost and supplier. | Intra-organization, role-scoped cost visibility is a product decision. | Parts owner |
| `accredit_staff_partner(uuid)` (promoter program) is `SECURITY DEFINER`, executable by `anon`, and performs no caller check in the migration history. | Outside the Parts program (plan §1.2 keeps promoters separate). | Platform security |
| Anonymous inquiry volume is not rate-limited. | Needs an abuse/rate-limit decision. | Parts owner |
| Supabase Realtime column filtering for anon subscribers must be confirmed on staging. | Requires a live Realtime instance. | Platform security |
| `shop_manager` schema isolation is only spot-checked (customers, work orders). | A dedicated Shop Manager tenancy suite belongs to that program. | Shop Manager owner |

## 7. G2 sign-off checklist

- [ ] Hardening migration reviewed and applied to a staging copy of production.
- [ ] `./scripts/test-parts-rls-adversarial.sh` green against staging (attach output).
- [ ] `/parts/network` search, inquiry submission (guest and signed-in) and "My requests" smoke-tested on staging.
- [ ] Residual risks in §6 accepted or ticketed by the named owners.
- [ ] Program owner records `G2` in the Parts plan.
