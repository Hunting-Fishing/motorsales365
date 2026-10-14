# Native profile, module and receipt authority composition

2026-10-15 Asia/Manila. Branch `security/native-access-composition-proof`, stacked
on verified PR #24 (`985a659`, all six gates, run `38632585607`). Offline behavior
proof and incremental source inventory only: **not an authority fix, complete
baseline, live workflow verification or production release**.

## Narrow live observation

`native-access-composition-metadata-2026-10-15.json` contains nine selected helper
catalog records observed at `2026-10-14 20:34:32.730047+00` and the override table's
catalog at `20:34:31.973345+00`, project `wjxaajgvddtrxxtocxen`. LF SHA-256:
`aaece0fb7c90dbae55a19f797bc9baff647b64901cc321cb1c43b029b8ee6a4a`.
The helper definition/body fingerprints and effective client EXECUTE observations
agree with the preceding narrow snapshots. No business helper was invoked; no
profile/customer/permission/vehicle/link/receipt/business row was inspected or
mutated. No live DDL, RLS/grant, migration-history or platform configuration changed.

Observed `shop_manager.shop_role_permissions`: postgres-owned, RLS enabled, not
forced; no policies and no authenticated table CRUD or anon SELECT privileges.
Owner/service ACLs are retained. Eight columns, PK, unique shop/role/module key,
two validated FKs and two indexes correspond to selected retained declarations.
Only four internal FK triggers were observed on this table. This is not proof of
every upstream, external or generic dynamic writer, complete role inheritance or
current business data integrity. MD5 fingerprints are identifiers, not authenticity.

| Recovered source                                          | Full-file LF SHA-256                                               | Selected scope                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql` | `f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71` | Override table DDL at line 514                                           |
| `20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql` | `b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68` | Two FK DO blocks at lines 6/7; catch-all skips cannot prove installation |
| `20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql` | `7bf224ec3dd224af201b73868146927a6dd14713c13ed68adf049d8e6d644442` | Schema/creator-default privileges                                        |
| `20260713070515_c57f9258-c8b3-4973-9eff-2d03ccade037.sql` | `c3b6e173df40642079846415d3eb200f2544c2114f2c19053fbfe2a53b1a0e62` | Dynamic existing-native-table CRUD/service grants and RLS enablement     |
| `20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql` | `d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321` | Conditional search-path/function/policy/client privilege sweep           |

The override has nullable JSON actions/timestamps/creator, unconstrained role and
module text, no action-shape CHECK, a created_by FK to **native profile ID** rather
than auth user ID, and a cascading shop FK. No concrete retained application writer
was found in the bounded search. Public `role_permissions` is a different object.
Operating-context callers in workspace, operations and counter sale are indirect
consumers; current module lookup reads overrides as a definer. Do not open table
writes to make an application error disappear.

## Disposable proof scope

The new suite composes the unchanged current-profile/current-shop/module and three
receipt helpers plus the actual text-role, membership and operations-manager
dependencies. Selected actual override/receipt/link/item DDL and receipt/link read
policies are used; supporting schemas/auth settings/remaining table shapes and
privilege reproduction are explicitly synthetic. Whole-file/selected-section pins
and current catalog fingerprints constrain this proof; no historical chain, seeds,
backfills, broad security sweep, business writer or deployment is executed.

Cases cover legacy/canonical/nullable-shadow profile composition, auth versus
profile-ID roles, module override precedence, read/view/manage versus absent or
empty overrides, privileged-role early return, read/write helper behavior,
owner-shared versus native shop-origin receipts, inactive links, null subjects,
cross-shop/stranger denial and source/fixture preservation. Focused tests pass
13/13; the complete local tooling suite passes 156/156. Independent review also
passed the combined 34 inventory/composition tests. ESLint/format checks pass.
Suite LF SHA-256: `6c1fd18421c6d0f94bd1e520b1da2db94504981ed32eb518cdc707c6034047c4`.
Locked PGlite 0.5.9 reports PostgreSQL 18.6. Its extra `contype=n` NOT NULL
catalog entries are excluded only after exact column nullability comparison;
other selected PK/unique/FK/index comparisons remain exact. This is not full
catalog equivalence with the hosted PostgreSQL engine.
No real JWT/HTTP/Storage download/concurrent transaction or full live schema parity
is inferred from session-setting memory fixtures.

The selected unchanged functions demonstrate boundaries, not new permissions:

- A matching empty/default/NULL override suppresses fallback vehicle modules;
  malformed boolean action strings propagate SQL errors rather than empty results.
- `view`, `read` and `manage` each enable the same vehicle helper path. The
  `shop_access` `_write` parameter is unused; no mutation RPC is exercised.
- Nullable-shadow and legacy profile/role combinations can disagree with id-only
  shop/manager helpers. All-module developer is not an operations-manager role.
- Shared owner-origin receipt access requires an active link, but ignores a lone
  `revoked_at` timestamp. Native shop-origin receipt access is a separate branch
  that survives link deactivation. Current-owner private receipt access remains
  separate from both. These synthetic cases do not assert current live rows.

## Incremental inventory, not baseline approval

The mutable seed manifest now pins 35 sources/seven evidence files and declares
73 objects/61 reachable, four cycles and 481 explicit unknown findings. These are
unreviewed facets/dependencies, not defect counts. The override table and its
native profile/shop FKs and module-reader edge are explicit. Mandatory table
owner/default/column/constraint/index/policy/grant/trigger, complete writer and
delegation facets remain **unreviewed**; additional observed catalog/declaration
facets do not promote them to complete coverage. A new regression preserves this
boundary; the inventory suite passes 21/21 and CLI deliberately returns 1.

Four recovered security/attachment sources are supported by retained legacy
source hashes. The selected driver's module source was stale-unclassified in this
registry; existing exact stored-SQL hash evidence now classifies it as source
correspondence, without claiming applied lineage or changing the global ledger.
Selected classes: 24 source-correspondence, six unclassified, five pending-forward.
Composed global evidence remains 404/422 with 18 unclassified. No old SQL or dated
evidence changed; all replay/baseline/parity/attachment/release flags remain false.
Manifest LF SHA-256: `b2f8d5937c3df9d1128b92d08a959ea13849f0e7fa3c8335f1b406b1d8663dd7`.

Security advisors still report the same four categories, not project clearance:
[RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[extension in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anon definer EXECUTE](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated definer EXECUTE](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Supabase changelog/security guidance was refreshed; no upgrade, extension, API,
TLS or default-privilege change was made. Definer/privilege guidance informed the
strict separation of existing behavior proof from new authority:
[function security and privileges](https://supabase.com/docs/guides/database/functions).

## Exact next dependency

Finish all native/chat/audit/storage writer and security attachment closure,
profile/role provisioning/legacy identity and multi-roster/offboarding invariants
before a companion guard. A future override writer needs an explicit owner/manager
delegation contract, action/role/module validation, transactional scope and audit
actor semantics; current_user inside a definer is not the human actor. Module
visibility is not granular write permission. Do not infer trusted membership,
repair bindings or widen client access from these read helpers.

The independent next application slice replaces the customer detail's three
browser reads with request-bound authenticated reads and masks stale primary/list
data during revalidation/errors. It changes no SQL/RPC permissions and must retain
the unresolved native authority, private vehicle consent/tenure, retention,
baseline/recovery/API, receipt mobile/pilot and hosting release gates. Pending
helper containment remains outside existing approval and is not re-requested.
