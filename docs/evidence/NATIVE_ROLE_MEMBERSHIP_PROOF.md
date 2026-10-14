# Native role and membership lookups: recovered prerequisite

Updated 2026-10-15 Asia/Manila. **Source/catalog correspondence and disposable
behavior proof, not mitigation or trusted membership.** No live business function
was invoked and no profile/customer row was read or modified.

## Exact recovered scope

The selected original definitions are executed unchanged in memory, not by
replaying whole migrations, seeding a real role catalog or running backfills:

| Function                                | Original declaration source                               | Full definition MD5 observed live  |
| --------------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| `has_role(uuid,shop_manager.app_role)`  | `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql` | `8bace4af65b1d02f541518da374db9a5` |
| `has_role(uuid,text)`                   | `20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql` | `0922679e807df45f65778f92e91c08ca` |
| `user_belongs_to_shop(uuid,uuid)`       | `20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql` | `ef1de965a932a522f9dd61a203338d17` |
| `is_shop_operations_manager(uuid,uuid)` | `20260831124952_employee_operations_ledger.sql`           | `e4acd815f99a4a61a24b3623db2e230c` |

All four are postgres-owned SQL/STABLE/SECURITY DEFINER. The first three have
observed effective anon/authenticated/service EXECUTE; the operating-manager
wrapper denies anon but retains authenticated/service. Their fixed search paths,
complete declared ACL text, definition/body fingerprints and two additional
resolver observations are recorded in
`native-role-membership-metadata-2026-10-15.json`, project
`wjxaajgvddtrxxtocxen`, at 2026-10-14 19:36:00.351 UTC. The evidence LF SHA-256 is
`fedaa75815414a84fea1b2414cc51a8e6ae9b0297a1da80b16e7ba57ee54bb64`.
MD5 identifies inspected definitions, not cryptographic authenticity or complete
deployed parity. Schema/Data API exposure and real HTTP/JWT behavior were not tested.

## Eight isolated regressions

`scripts/ci/shop-manager-role-membership.test.mjs` pins whole-file and extracted
definition SHA-256 values, the immutable metadata file and its canonical project/
scope/time/fingerprints. Only the four selected CREATE FUNCTION definitions run
in sequential, always-closed memory-only PGlite fixtures, with 20-second test,
3-second statement and 1-second lock limits. Reduced tables and eight explicitly
listed enum labels are synthetic supporting setup, not the full native
enum/catalog or native constraint/trigger parity.

Tests verify:

- Text and enum overloads agree on valid exact roles but differ on invalid input:
  text returns false; enum conversion raises. The operating-manager definition
  explicitly casts its six role literals to text, not the enum overload.
- Roles are global bindings. The operating wrapper additionally requires the
  supplied user/shop membership; a global manager role alone is not tenant scope.
- Membership compares `profiles.id`, not `profiles.user_id`. A legitimate legacy
  profile with different IDs can have an auth-user manager role yet fail the
  wrapper. Passing the legacy profile ID instead does not magically repair role
  binding. Same/other/missing/null shop and actor cases remain distinct.
- Direct SELECT is first denied by active RLS and then by table ACL, while the
  unchanged elevated helpers still answer supplied other-user lookups, including
  a null synthetic JWT subject. The wrapper does not itself authenticate that
  the supplied actor equals the human caller. A mutation must bind and authorize
  its actor independently; this is not proof of an external exploit.
- Anonymous EXECUTE is denied for the wrapper but not the three lookup helpers
  in the observed-ACL fixture. Owner/service behavior is retained. Installing,
  rerunning and calling the selected definitions does not change native fixture
  data, table/schema ACLs or ownership. Fixture-only role permutations roll back.

This does not harden mutable profiles/rosters, repair existing bindings, establish
delegated owner authority, prove role membership inheritance or audit every
dynamic/unqualified caller. No grants, policies, function bodies or migration
history were changed live. The two helper restrictions from PR #18 remain outside
the converter-only approval and are still pending a separate owner decision.

## Inventory extension and next dependency

The mutable seed inventory now pins the two newly recovered source files plus
the new dated evidence: 31 sources, six evidence files, 72 declared objects and
60 reachable objects. Nineteen source pins have supported hash correspondence,
seven remain unclassified and five remain pending-forward. Four cycles and 470
unknown-coverage findings remain; these include repeated facets/attachments, not
470 confirmed defects. Existing dated evidence files and historical SQL remain
unchanged. Global correspondence remains 404/421 files, not baseline approval.

The new enum-overload node is declared separately and remains outside the
current root closure; this is reported rather than hidden. Newly observed catalog
facets do not mark all effective grants, supersessions, callers or trusted tenant
authority complete. Every replay/baseline/applied-lineage/parity/release flag
remains false and the inventory CLI intentionally exits 1.

Next: close the current-employee/current-shop/module and receipt access-helper
declaration/supersession/privileged-writer/security attachment closure, then
rehearse a companion roster/native guard with real shift CHECKs and all native/
chat triggers. Preserve legitimate self-shift, delegated manager and legacy IDs;
do not substitute a global role or self-writable profile binding for independent
authority. Existing-state conflict detection/repair needs its own reviewed scope.

Independent Customer 360 read-contract review found that public vehicle RLS has
owner/public/admin visibility, not linked-shop private-vehicle visibility. A
strict invoker/current-owner join must fail closed for that case. Do not broaden
vehicle row/column access or introduce a definer shortcut to make the fixture
green. Test the real-policy negative control and retain the ownership-tenure,
private-vehicle and native authority release prerequisites.

## Guidance and advisor boundary

[Supabase function privileges](https://supabase.com/docs/guides/database/functions)
informed invoker preference and explicit function/role paths, not blanket grants.
The changelog/minor-release/Data API/TLS notices were reviewed; no platform or
extension configuration changed. The security advisor still reports the same
four categories, not project-wide clearance:
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[public extension](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
and [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
