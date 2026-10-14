# Native baseline dependency inventory: offline declaration checks

Updated 2026-10-15 Asia/Manila. This is an initial hand-reviewed registry and
read-only validator, **not a baseline migration or release approval**.

`baseline-native-scope-v1.json` pins selected original SQL and dated evidence
files. Current registry source snapshot is `4100bbfd4513ddeefe21c7d138c88955ff96fadf`;
the initial PR #20 snapshot/counts below are retained as historical evidence. Its roots cover
native identity/staff, customers/work orders and receipt/history entry points.
Unknown objects, security attachments, data assertions, external platform
prerequisites and pending forward sources remain explicit rather than guessed.
Native profile `shop_id` is a logical binding, not an invented foreign key.

Initial PR #20 selected scope: 29 SQL sources and five evidence files, 71 declared
objects, eight roots and 158 edges. Sixty objects are reachable; four DFS
back-edge cycles and 467 unresolved findings remain. Findings include repeated
unreviewed facets and explicit external prerequisites, not 467 confirmed defects
or a completion percentage. Seventeen sources have supported hash correspondence,
seven remain unclassified in this narrow inventory and five are pending-forward.
The initial manifest LF SHA-256 was
`4e32fb1e4ab80ae3074231e09ffd1c83044da35b580dd3fbfba238f190de4ba5`.

## What the validator actually checks

Run from the repository root:

```powershell
node scripts/ci/baseline-scope-inventory.mjs docs/evidence/baseline-native-scope-v1.json
node --test scripts/ci/baseline-scope-inventory.test.mjs
```

The first command currently returns **exit 1 / explicit_unknown_coverage**. This
is the expected incomplete inventory, not a test failure to suppress. Exit 2
means malformed declarations, missing/tampered pins or invalid input. Exit 0
means only supplied declarations/pins/declared closure satisfy this tool; it
still cannot verify replay, SQL identity, attachments, applied lineage, schema/
data/ACL parity or release approval. Every such output flag remains false.

The validator checks canonical repository/project, CRLF-to-LF-only SHA-256 pins,
unique declared IDs/function signatures, referenced sources/evidence, dependency
closure and actual DFS back-edge cycles. Cycles can be legitimate database
relationships; they are reported for review, not mislabeled invalid JSON or
treated as an executable migration order. Disconnected declared nodes also stay
visible. Table owner/default/sequence/column/constraint/index/policy/grant/trigger
facets are mandatory, as are declared identity/attachment facets for triggers,
policies and grants. These are manual declarations, not SQL parsing or complete
catalog enumeration; PostgreSQL type aliases and dynamic calls are not resolved.

Source correspondence requires matching pinned JSON filename/hash evidence or
retained full-source hashes. Catalog body observations and Markdown split/source
audits do not automatically become whole-file execution proof. Pending-forward
sources cannot be promoted by a matching hash. `appliedLineageInferred=false`
means no live execution conclusion is drawn, not that known deployed files are
unapplied. At the initial PR #20 checkpoint, broader composed migration evidence
was404/421 with17 unclassified. Current composed evidence is404/423 with19
unclassified; this selected dependency registry does not replace that ledger.

The CLI allows only named migration/evidence inputs within this repository,
rejects traversal/absolute paths and symlink/junction escapes, caps the manifest
at 2 MiB, individual inputs at 8 MiB and aggregate inputs at 32 MiB before each
read. Object/source/evidence/dependency/JSON-depth limits bound accidental input
growth. Output contains metadata, hashes and finding IDs, not SQL bodies.
There is no database/network client, subprocess, SQL execution/generation,
filesystem write, history adoption or release path.

## Verification and remaining dependency

Twenty tests pass, covering deterministic/immutable input, CRLF transport,
tampering, identity/project mismatch, dangling/duplicate declarations, cycles,
explicit unknowns/exclusions, forward-source boundaries, required facets,
metadata-only output, constrained paths and incremental aggregate-read caps.
The actual repository manifest integration test requires the expected incomplete
state. Complete local tooling passes 109/109. Focused ESLint, formatting and diff
checks pass. Full-checkout CI publication is recorded in the completion checklist.

No SQL file or live schema/data/history changes in this slice. The historical
counter-cost replay trap remains frozen; role/bucket/reference seeds, temporary
ingress/auth transfer/demo/reseed/acceptance operations and provisioning/history
backfills are excluded from implicit execution. Five pending-forward pins remain
separate from observed state, including the two unapproved helper candidates.
No application artifact is uploaded; the sparse checkout must not be deployed.

Next, resolve the native identity/roster and receipt access-helper declaration,
supersession, security-attachment and writer closure against pinned source and
fresh narrowly scoped metadata. Do not promote a source-observed facet to full
coverage. The following concrete declaration sources are now mapped and their
selected unchanged definitions match the fresh catalog and isolated regressions:
`20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql` for the text overload of
`has_role(uuid,text)` and
`20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql` for
`user_belongs_to_shop(uuid,uuid)`. The operating-manager caller explicitly casts
role literals to text. Do not substitute the enum overload or infer legacy
`id=user_id` equivalence from these declarations. Source recovery alone does not
establish complete catalog/permission parity or trusted membership. See
`NATIVE_ROLE_MEMBERSHIP_PROOF.md`: eight new tests, 31 sources/six evidence files,
72 declared objects/60 reachable, four cycles and 470 explicit unknown findings.
That dated manifest LF SHA-256 was
`c775403f37ebfe9cefcdaca671f997e6a5537e8e30ddc1063ff7ef2022593156`.
All release/parity/replay flags remain false; dated earlier evidence is unchanged.

The PR #25 composition increment is recorded in
`NATIVE_ACCESS_COMPOSITION_PROOF.md`. That scope: 35 pinned sources, seven
evidence files, 73 objects, 61 reachable, four cycles and 481 explicit unknown
findings. Selected source classes are 24 source-correspondence, six unclassified
and five pending-forward; its dated global composed ledger was404/422 with18
unclassified. Four recovered privilege/FK/sweep sources and a corrected stale
module-source classification are supported by retained hashes, not inferred
applied lineage. The override table, its native profile/shop dependencies and
module-reader edge are now declared; mandatory security, writer and delegation
closure remained unreviewed. That manifest LF SHA-256:
`b2f8d5937c3df9d1128b92d08a959ea13849f0e7fa3c8335f1b406b1d8663dd7`.
Inventory tests pass 21/21; complete local tooling passes 156/156. CLI exit 1
remains intentional and all baseline/replay/parity/attachment/release flags false.

## Current staff/chat inventory increment

The subsequent actual-constraint/all-staff-trigger rehearsal is implemented in
PR #34 (all six CI gates at docs `4100bbf`), not a guard or live offboarding acceptance.
The current bounded inventory in draft PR #35 (code `8e52323`)
adds two hash-supported sources, one unchanged dated catalog and13 manual nodes,
with an explicit offboarding/audit unknown. Current scope:37 sources,8 evidence
files (45 verified pins),86 objects,74 reachable,201 edges,18 reported DFS
back-edge cycles and566 unresolved findings. Classes:26 source-correspondence,
6 unclassified,5 pending-forward. Added cycles/findings are review obligations,
not defect totals or completion percentages. All mandatory table facets remain
unreviewed; no full owner/ACL/writer/policy/attachment closure is promoted.

Current manifest LF SHA-256:
`c208edd504a456c4926c69b88d35a68057313be8d9e844ec843cb22ef11902bb`.
Metadata tests pass26/26, full sequential tooling220/220, focused lint/format/diff
and independent review pass. Remote CI pending verification. Tests include strict project/projectRef evidence identity,
no whole-source/applied promotion and the conservative real-inventory state.
Manifest identity stays project-only; every present evidence alias must exactly
match it. Existing evidence bytes are unchanged. See
`NATIVE_STAFF_DEPENDENCY_INVENTORY.md` for pins, publication/test results and
precise limits. Mixed dated observations are not one atomic database snapshot.
CLI exit1 is still intentional and every baseline/replay/parity/release flag
remains false. No SQL generation, database/network execution or deployment.

Next recover selected current chat policy/helper composition and incoming
shop/business/shift/register/work-location metadata without business data or
writer calls; compose corresponding source on disposable fixtures. Then develop
the offline companion identity/self-shift/owner/delegation/offboarding/audit
contract and real concurrency tests before authorized atomic invoicing.
Then construct a separately reviewed baseline with explicit platform/reference
configuration and data assertions, replay twice into disposable empty targets,
test the existing-state upgrade and recovery, and verify adversarial role/API
behavior. This inventory authorizes none of those live operations.
