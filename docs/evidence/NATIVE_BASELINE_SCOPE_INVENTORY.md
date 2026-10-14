# Native baseline dependency inventory: offline declaration checks

Updated 2026-10-15 Asia/Manila. This is an initial hand-reviewed registry and
read-only validator, **not a baseline migration or release approval**.

`baseline-native-scope-v1.json` pins selected original SQL and dated evidence
files at source snapshot `88a8977f4d2fd79420b7c447ab5686eb01510e9c`. Its roots cover
native identity/staff, customers/work orders and receipt/history entry points.
Unknown objects, security attachments, data assertions, external platform
prerequisites and pending forward sources remain explicit rather than guessed.
Native profile `shop_id` is a logical binding, not an invented foreign key.

Initial selected scope: 29 SQL sources and five evidence files, 71 declared
objects, eight roots and 158 edges. Sixty objects are reachable; four DFS
back-edge cycles and 467 unresolved findings remain. Findings include repeated
unreviewed facets and explicit external prerequisites, not 467 confirmed defects
or a completion percentage. Seventeen sources have supported hash correspondence,
seven remain unclassified in this narrow inventory and five are pending-forward.
The manifest LF SHA-256 is
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
unapplied. The broader composed migration evidence remains 404/421 files with
17 unclassified; this selected dependency registry does not replace that ledger.

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
coverage. The next concrete declaration sources already located (not yet mapped
into this initial manifest) are
`20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql` for the text overload of
`has_role(uuid,text)` and
`20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql` for
`user_belongs_to_shop(uuid,uuid)`. The operating-manager caller explicitly casts
role literals to text. Do not substitute the enum overload or infer legacy
`id=user_id` equivalence from these declarations. Source recovery alone does not
establish current catalog/permission parity or trusted membership.
Rehearse a companion guard with actual CHECKs/all enabled triggers and
legacy/self-shift/manager/multi-roster cases before authorized atomic invoicing.
Then construct a separately reviewed baseline with explicit platform/reference
configuration and data assertions, replay twice into disposable empty targets,
test the existing-state upgrade and recovery, and verify adversarial role/API
behavior. This inventory authorizes none of those live operations.
