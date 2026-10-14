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

## 6. Residual risks and follow-ups

The first five items below were fixed in the follow-up migration
`20260927120000_parts_network_security_followups.sql`; see §8.

| Item | Status |
|---|---|
| `businesses` was publicly readable with table-level `SELECT`, which exposed `network_exposure_review_note`, `network_exposure_reviewed_by` and `custom_domain_verify_token`. | **Fixed (S1)** |
| Every active staff role (mechanic, driver, clerk) of a business could read its own inventory cost and supplier. | **Fixed (S2)** |
| `accredit_staff_partner(uuid)` (promoter program) was `SECURITY DEFINER`, executable by `anon` and did no caller check. | **Fixed (S3)** |
| Anonymous inquiry volume was not rate-limited. | **Fixed (S4)** |
| Supabase Realtime column filtering for anon subscribers needed confirmation. | **Covered (S5)**: replayed locally through walrus; one staging smoke test is still recommended. |
| `shop_manager` schema isolation is only spot-checked (customers, work orders). | Open. A dedicated Shop Manager tenancy suite belongs to that program (owner: Shop Manager). |

## 7. G2 sign-off checklist

- [ ] Hardening migration reviewed and applied to a staging copy of production.
- [ ] `./scripts/test-parts-rls-adversarial.sh` green against staging (attach output).
- [ ] `/parts/network` search, inquiry submission (guest and signed-in) and "My requests" smoke-tested on staging.
- [ ] Follow-up migration (§8) reviewed and applied to staging after the hardening migration; `--local --realtime` output attached.
- [ ] Remaining residual risk in §6 accepted or ticketed by the named owner.
- [ ] Program owner records `G2` in the Parts plan.

## 8. Security follow-ups (migration `20260927120000`)

`supabase/migrations/20260927120000_parts_network_security_followups.sql` builds on the hardening
migration `20260927090000` and must be applied **after** it. It is additive: no table, column or
row is dropped or rewritten. Suite section **5b** covers every fix. Before the migration 51 of the
247 assertions fail; after it all 247 pass. The Realtime replay passes 10 of 10 checks after the
migration and 7 of 10 before it.

| # | Finding | Fix | Suite coverage |
|---|---|---|---|
| S1 | `anon`/`authenticated` could select `businesses.custom_domain_verify_token`, `network_exposure_review_note` and `network_exposure_reviewed_by`. `API select=*` exposed them on every public business row. The owner of an unrelated domain row could also set `custom_domain_status = 'verified'` directly. | Table-level `SELECT` is replaced by a column grant on every other column, so these three columns are no longer selectable. Members and moderators read review notes through `get_business_network_exposure_reviews(uuid[])`. The owner, managers and moderators read the token through `get_business_custom_domain_token(uuid)`. Trigger `trg_guard_business_custom_domain_verification` blocks API callers from marking a domain verified, and changing the domain resets verification. The server marks the domain verified with the service role after the DNS TXT check. | `S1 …` (anon, outsider, competitor, mechanic, owner, admin) |
| S2 | Every active staff role could read `business_inventory_items.cost`, `supplier` and `markup_percentage`. That included filtering on them and receiving them in Realtime payloads. | `authenticated` loses `SELECT` on those columns. `get_business_inventory_costs(uuid, uuid[])` returns them only when `can_view_business_inventory_costs`, which is true for the owner, `manager` and `assistant_manager`, the same set that may write stock. Writes are unchanged. The app no longer upserts, because `ON CONFLICT … EXCLUDED.cost` needs `SELECT`. | `S2 …` (mechanic denied incl. `WHERE cost > …` side channel, assistant manager allowed, owner writes) |
| S3 | `accredit_staff_partner` was executable by `anon` through `PUBLIC` and performed no caller check. | `EXECUTE` revoked from `PUBLIC`/`anon`. A direct API call must come from the staff user themself or from an admin. Trigger, cron, migration and service-role contexts keep working. | `S3 …` |
| S4 | Inquiries were not rate limited. | Trigger `trg_npi_throttle` (BEFORE INSERT, `SECURITY DEFINER`, advisory-locked) sets these limits: 5 per contact e-mail per hour and 20 per day (case-insensitive); 10 per signed-in requester per hour; 30 guest inquiries per partner per hour. `created_at` is forced to `now()` so the window cannot be dodged by backdating. It raises `SQLSTATE PT429`, which PostgREST returns as **HTTP 429**. Service-role and internal inserts are exempt. | `S4 …` |
| S5 | Realtime exposure of columns. | Realtime (`realtime.apply_rls`, supabase/walrus) drops every column the subscriber's role cannot `SELECT`, including `old_record` under `REPLICA IDENTITY FULL`. S1/S2 therefore also remove those columns from `postgres_changes` payloads. Before this migration, **staff subscribers received cost/supplier/markup** in inventory change events. Anon was already limited by `20260927090000`. | `S5 …` privilege and drift guards; `supabase/tests/parts_network_realtime_columns.sql` replays real WAL (wal2json) through walrus for anon, mechanic and owner subscribers. |

### Behaviour changes (API clients)

- `select("*")` / `select=*` on `businesses` now fails with *permission denied* for `anon` and
  `authenticated`. List columns explicitly. For owner and editor screens, use
  `BUSINESS_EDITOR_COLUMNS` in `src/lib/security/restricted-columns.ts`. The only such call in
  the repo was the page editor, and it has been updated.
- `select("*")` on `business_inventory_items` fails for `authenticated`. Use
  `INVENTORY_MEMBER_COLUMNS` and merge costs from `get_business_inventory_costs`.
  `listBusinessInventory` returns rows with `cost_restricted: true` and no cost keys for staff
  without cost access. The item form then locks cost, supplier and markup and never sends them.
- Column privileges do not extend to columns added later. Every future migration that adds a
  column to `businesses` or `business_inventory_items` must call
  `SELECT public.reapply_restricted_column_grants();`. The suite's S5 drift guards fail if it is
  forgotten.
- Custom domains can now only be managed by the owner and manager-level staff. Previously any
  staff member passed the server check.

### How to run

```bash
# rolled-back suite (sections 1–6 incl. 5b)
./scripts/test-parts-rls-adversarial.sh --local
# plus the Realtime replay (needs wal_level=logical and wal2json on the local server)
./scripts/test-parts-rls-adversarial.sh --local --realtime
```
