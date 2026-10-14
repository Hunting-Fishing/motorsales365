# Read-only migration object audit

Observed: 2026-10-15 (Asia/Manila). Project: `wjxaajgvddtrxxtocxen`.

## Scope and limits

This audit investigates the 12 existing repository migrations which did not have
an exact retained full-source hash match in the 2026-10-14 provenance snapshot.
It excludes the two pending Parts security migrations and the pending receipt
trigger correction. It neither applies SQL nor repairs migration history.

All live checks were SELECT queries against PostgreSQL system catalogs and
specifically selected module migration records. No application, acceptance-test,
or demo RPC was invoked. No customer rows, archive contents, authentication
records, secrets, or bootstrap migration bodies were read. Local changes are
limited to this evidence document.

Source correspondence, current object state, and replayability are separate
claims. This document is not approval to push the historical migration chain,
mark differing timestamps applied, or deploy production. Data backfill and seed
parity were not tested.

## Priority findings

### Employee module access

- Repository `20260831130502_employee_module_access.sql` is the retained
  `20260831130719` source plus the three-line truck-driver module block. Removing
  precisely that block produces exact source equality, including all other text.
- The later repository driver migration `20260901025637` corresponds to the
  previously verified retained `20260901025711` migration.
- Current `employee_operating_context()` body equals the repository module body
  after trimming outer whitespace. Current `employee_allowed_modules()` body
  equals the later driver migration body under the same comparison.
- Both functions return their expected `jsonb` / `text[]` types, are STABLE,
  SECURITY DEFINER, owned by `postgres`, and pin
  `search_path=shop_manager, public, pg_temp`.
- Effective EXECUTE: anon false, authenticated true, service_role true.

### Receiving-exception privileges

- Repository `20260910170500_harden_parts_receiving_exception_privileges.sql`
  and retained `20260910170605` have the same SQL after removing line comments
  and normalizing whitespace. The original full-source hashes differ.
- Current exception table: RLS enabled; anon has no table or column privileges;
  authenticated has SELECT but no INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER;
  service_role retains full table privileges.
- Exception sequence: anon/authenticated have no USAGE, SELECT, or UPDATE;
  service_role has all three. The retained service-role UPDATE is not a client
  privilege and is not a failure of the requested client-role restrictions.
- Both create/transition RPCs deny anon execution and allow authenticated and
  service_role execution. No RPC was called.
- The sole exception-table read policy is authenticated participant access via
  membership in requester or supplier business.

### Business part cross-references

- Repository `20260902123940_business_part_cross_references.sql` is exactly the
  retained `20260902124106` source with one additional REVOKE statement. Removing
  that exact statement and its following newline produces byte-for-byte source
  equality after LF normalization.
- The additional statement is exactly the retained `20260902124411` privilege
  migration: authenticated cannot TRUNCATE, REFERENCES, or TRIGGER this table.
- Current table has the expected 14 columns, stored generated normalized number,
  four foreign keys, two enum-value checks, non-null normalization check, primary
  key, and four valid indexes. Index definitions match the repository identities
  and lookup/catalog predicates.
- The four authenticated policies match member SELECT and manager
  INSERT/UPDATE/DELETE. UPDATE has both USING and WITH CHECK manager predicates.
- Current ACL: anon has no table or column privileges; authenticated has CRUD
  only; service_role has full privileges. RLS is enabled, not forced, as authored.
- Both expected triggers are enabled: inventory insert/relevant-column update
  synchronizes cross-references, and cross-reference update maintains timestamp.
- Current synchronization function body matches the repository body after
  trimming outer whitespace; it returns trigger, is SECURITY DEFINER, pins
  `search_path=public, pg_temp`, and is executable only by service_role among the
  checked client/service roles. Backfilled row completeness was not inspected.

### Closed migration ingress

- Retained counterpart is `20260911143840`; its body was not retrieved because
  archive migration bodies were outside this audit's source-reading scope.
- Both `migration_ingest` and `migration_auth_transfer_keys` currently have RLS
  enabled **and forced**.
- Neither anon nor authenticated has any table-level privilege or any
  SELECT/INSERT/UPDATE/REFERENCES column-level privilege on either table.
- Neither table has any policy. Consequently both named temporary anonymous
  ingress/count policies are absent.
- Both catalog table comments exactly match the local sealing migration.
- These facts confirm the checked sealing effects, not exact source identity or
  absence of every possible privileged operational path.

## Remaining eight sources: correspondence and current-function checks

| Repository migration | Retained evidence and result | Remaining limit |
| --- | --- | --- |
| `20260831041834_associate_parts_order_lifecycle` | Eight retained splits: `20260831104112`, `20260831104125`, `20260831104159`, `20260831104213`, `20260831104214`, `20260831104216`, `20260831104315`, `20260831104335`. Their combined 1,206 nonblank-line multiset equals the local source. All ten authored function bodies exactly match their retained split and current body after outer whitespace trim. | Split ordering is not a replay test. Full table/constraint/data parity was not certified. Client grant drift below prevents a security-parity claim. |
| `20260831113000_business_associate_enrollment` | Retained base `20260831105957`. Removing six specific lines covering reviewer index, anonymous RPC revocation, and public projection-column grant leaves identical nonblank lines in order. These changes are covered by the separately recorded hardening/projection migrations. Both current enrollment RPC bodies match local bodies. | Current table/view/policy and acceptance-workflow parity were not comprehensively exercised. |
| `20260831114500_associate_privacy_customer_vehicle_ledger` | Retained base `20260831114923`. Removing six trigger-function REVOKE/GRANT lines leaves identical nonblank lines in order. All eight current function bodies match local bodies. The three internal trigger helpers deny anon/authenticated execution and allow service_role. | A separate retained source for those six grant additions was not identified. Receipt migrations later extend the ledger. No consent/history/customer rows were read. |
| `20260831193523_counter_sales_registers_pricebook` | Retained base `20260831194001` differs only in `i.cost` versus `i.cost_per_unit`; applying that exact string correction makes source equality exact. Current three register/counter functions match local bodies after removing the one later counter-role guard from each. | Full sales-table schema/data parity and workflow tests remain outside this pass. Historical replay hazard below is confirmed. |
| `20260901025424_business_staff_shop_manager_bridge` | Retained base `20260901025616` predates owner-authoritative routing. Current staff-member function body exactly matches later assistant-manager migration; current staff-trigger SQL tokens match the local owner-authoritative trigger and retained boundary fix. | Bridge staff provisioning/backfill results were not read or rerun. |
| `20260901134215_parts_demo_playground` | Actual local content is invoice/payment trigger correction, not demo seeding. Latest relevant retained records are `20260901160849` (invoice accounting source UUID) and `20260901160923` (payment work-order UUID); invoice predecessor `20260901160809` is superseded. Local and current bodies have identical SQL tokens, ignoring comments/whitespace and unquoted identifier case, with string literals preserved. Both return trigger and pin the authored search path. | Token equality is narrower than an end-to-end accounting test. Their PUBLIC EXECUTE grants remain security-hardening work. |
| `20260902162000_parts_receiving_exceptions` | Retained base `20260910170508` predates folded-in grant/quarantine changes. Current transition body matches base/local. Current create and quarantine bodies exactly match later repository quarantine migration `20260910172000`, whose retained counterpart `20260910170925` was previously exact-hash verified. Current table policy and client ACL checks pass as above. | Full table-schema and exception-resolution workflow parity were not certified. |
| `20260902131844_seed_ph_chassis_vehicle_profiles` | No same-name retained history record. | Still unproven. This is data-seed parity, not catalog-object parity; no reference-data row query or seed execution was performed. |

Across the 30 current module functions inspected for these eight sources: 24
body comparisons were exact after trimming outer whitespace; three had identical
SQL tokens under the limited normalization described above; three counter bodies
were exact after accounting for their separately authored counter-role guards.
This count concerns bodies only, not complete function signatures/ACL/schema
parity. The priority module/cross-reference functions above were checked
separately.

## Release-significant hazards

1. **Full historical replay is not safe as-is.** The local counter-register
   source already uses `i.cost_per_unit`. Later
   `20260901021500_fix_counter_sale_inventory_cost.sql` requires the obsolete
   `i.cost);UPDATE` text and raises if absent. Retained original SQL still uses
   `i.cost`; this confirms that the local historical file was amended after the
   separately recorded fix. Do not rerun the fix against the corrected function.
2. **Anonymous grants remain on lifecycle functions.** Explicit anon EXECUTE is
   present on `can_access_parts_order`, `create_parts_network_order`,
   `transition_parts_network_order`, `receive_parts_network_order`,
   `create_parts_return`, `record_installed_component`,
   `create_parts_warranty_claim`, `transition_parts_return`, and
   `transition_parts_warranty_claim`. The original source revokes PUBLIC but does
   not revoke inherited explicit anon grants. The queued security release must
   remain a gate. Grant presence alone is not proof of exploitable unauthorized
   mutations: body authentication checks were not bypassed or exercised here.
3. Anonymous EXECUTE on `active_reservation_qty` and `is_active_associate` is
   explicitly authored; these are not automatically classified as accidental.
4. Invoice/payment trigger functions retain PUBLIC EXECUTE. They return trigger,
   which limits direct invocation, but least-privilege hardening still needs
   review. No direct invocation was attempted.
5. Acceptance/demo migrations must not be used as live read-only probes.
   Acceptance changes then deletes an application and can fire newer triggers;
   tow demo functions delete/reseed inventory/assets.

## Reproducible read-only check descriptions

- History: select only listed module versions from
  `supabase_migrations.schema_migrations`; inspect statement count and SHA-256 of
  `array_to_string(statements, E'\n')` after CRLF-to-LF normalization. Retrieve
  module bodies only when needed. Do not select unrelated archive/auth/bootstrap
  bodies. All audited records contained one retained statement-array element.
- Function comparison: select `pg_proc.prosrc`, `prosecdef`, `proconfig`,
  identity arguments, body SHA-256, and effective EXECUTE through
  `has_function_privilege` for anon/authenticated/service_role. Additional
  signature checks used `pg_get_function_result`, `provolatile`, and owner role.
  Read function source; never call the named application function.
- Table permissions: use `pg_class.relrowsecurity` / `relforcerowsecurity`,
  `has_table_privilege` for each seven table privilege types, and
  `has_any_column_privilege` to detect column grants that survive table revocation.
- Policies: inspect `pg_policy`, role OIDs, command, and `pg_get_expr` for USING
  and WITH CHECK. Sealed archive policy absence was checked in the same catalog
  query as the expected cross-reference/receiving policies.
- Sequence permissions: use `has_sequence_privilege` for USAGE/SELECT/UPDATE.
- Cross-reference structure: inspect `pg_attribute` / `pg_attrdef`, including
  `attgenerated='s'`; `pg_constraint` definitions; valid `pg_index` definitions;
  enabled noninternal `pg_trigger` definitions. No rows from those tables were
  selected.
- Source normalization is explicit per finding; full-source hash mismatch is
  never silently converted into exact-hash proof.

## Retained source hashes observed in this pass

These are SHA-256 hashes of LF-normalized retained module SQL, not guarantees
that the current local file has the same full source or that every effect remains
unchanged.

| Deployed version | SHA-256 |
| --- | --- |
| `20260831130719` | `ea61c34eaa83374751602bed15a87d0e70fadcbb5225aa98c22495ad74985d51` |
| `20260902124106` | `c422ebb5a0fd50f7e81504d1d3a0c6a08b7cb0bc18604869265aa6162beee2e9` |
| `20260902124411` | `24b4df0c04d87dc058e4be4236a6b4f7d4f4b4d1802bd99587fd3a17ac7a2cbb` |
| `20260910170605` | `70b2989b94a5a9e1ef09ddc6ba3bd184364daff9d681a8de61b96a78d3731dfe` |
| `20260911143840` | `81321e1ace678f8400c849041484a10189d456c41efff2e9621dfca815267a12` |
| `20260831104112` | `83a59fde02f1a956125290bde0d997cd1dd01529b3c546fc5e96d32334f3317c` |
| `20260831104125` | `c3fd17770cb49a30402c1be20dc3a674bfb006d25b59bb48e791c33a20822d08` |
| `20260831104159` | `195a137ef1b8f03a8b2dad4241a994f5c0c9f787ab3f890c8031cfbd9d093d91` |
| `20260831104213` | `e09129325b38b5f84b90eb145b3b3787dd5b64b0b49ef883ea6c4fb5cecc7d34` |
| `20260831104214` | `a4362ef47642403a38a654331643ef63e765955d2c3b9f6bd8b50de7c4b58359` |
| `20260831104216` | `ea7c8bf41491d4f194ceba41ce75c7e3750d1a2b13a5834bdd2176543990971e` |
| `20260831104315` | `ba284152e4e0ee344e81ca2372998bd890adb2a0456e271368b0d04e5ba515d6` |
| `20260831104335` | `b8f35a7ad9d9e7d973f52949754b70c86132d2f602e04427f4f1582e7934c9ee` |
| `20260831105957` | `07a7fac085f43dbc48b75ba5e92e300faf5246768d05e049c11809afa68773ec` |
| `20260831114923` | `1bdecb8442d965fef857af165b75d59ce8cec7aad8491b99678b679f85d8ee50` |
| `20260831194001` | `0d7c9894ce7c2d4a0ff73b524cf07725a3e9a92a4f15ab61c3596103278c5e57` |
| `20260901025616` | `0e768b1b9c392b7f002f59d9177632a5930bca64ecdabc2fa3373b116d046684` |
| `20260901160809` | `87d53c6edd93394b32f365e592a5c6f21128efb9cae0d26cdf14a8c666456607` |
| `20260901160849` | `f26ad2422cf93d9b979c114563f428d743a990e07c0b946d1e227cc813afbe80` |
| `20260901160923` | `c3de83e19405198de784c582fdb2d9edf9876ab69a4adf8d6f51bd74444ad394` |
| `20260910170508` | `7f3c1f1ac5e406fa1dd6434de52d136f5d43e680b25053db1edff8d0f5409fe9` |

## Next safe actions

1. Preserve this evidence alongside the fail-closed provenance manifest; do not
   silently promote semantic/split correspondence to exact full-source matching.
2. Design and test a reproducible baseline strategy on disposable/staging data,
   including the confirmed counter-cost replay failure and later trigger changes.
3. Verify the PH chassis seed through separately scoped aggregate reference-data
   checks or a disposable seed test; do not rerun it blindly in production.
4. Re-run role and adversarial checks after the separately reviewed security
   migrations, then check remaining table/view/storage boundaries before release.

Guidance consulted: the installed Supabase skill; current
[changelog](https://supabase.com/changelog.md), the PostgreSQL
[minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes),
[roles](https://supabase.com/docs/guides/database/postgres/roles), and
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
This audit performs no extension/index/cryptography upgrade and no schema change.
