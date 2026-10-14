# Native staff/chat inventory increment: offline metadata only

2026-10-15 Asia/Manila. This bounded inventory increment follows the unchanged-
source staff/chat/offboarding rehearsal in PR #34. It does not implement a guard,
change source SQL or grant production authority. No database, count, helper RPC,
network delivery, history adoption, platform change or deployment runs here.

Branch `security/native-staff-dependency-inventory`, stacked on PR #34 docs
`4100bbf`, all six CI gates passed (run `38650592549`), verified on this follow-up.
Draft PR #35: `https://github.com/Hunting-Fishing/motorsales365/pull/35`, code
`8e52323`. Full sequential tooling220/220, focused lint/format/diff and independent
review pass. Documentation head `d7fb4cc` passed all six CI gates (run
`38651770280`), verified on the chat-policy follow-up.
Application source stays at the723-test verified parent. Hosting remains a
separate blocker; a green preview wrapper is not an upload/release.

## Identity adapter, not relaxed provenance

The dated catalog uses projectRef, while older evidence uses project. The
read-only validator now accepts either **only if every present field exactly
matches canonical manifest.project**. Missing, null, malformed, padded, uppercase,
coerced or conflicting values fail closed. The manifest still requires project;
projectRef cannot replace it or appear as an extra manifest field. No dated
evidence file is rewritten, normalized into another identity or upgraded.

Four new synthetic tests verify equivalent reports from frozen inputs, malformed/
conflicting identities and non-object roots, strict manifest identity, and no
source/applied-lineage promotion from catalog-only fingerprints. Whole-file pins,
bounded reads, path/junction checks and correspondence classification stay intact.
Catalog-correspondence still cannot establish whole-source SQL correspondence.

## Concrete manual dependency delta

- Two source pins: chatBase and timestampShared, whose exact filename/LF hashes
  match the existing pinned provenance.legacyApplied source records. This
  supports source-correspondence, not retained applied SQL or execution history.
- One unchanged dated staffTriggerCatalog pin: four table records and five
  function fingerprints/ACLs from the earlier catalog-only snapshot. No fresh
  live query or business data is used by this increment.
- Twelve concrete nodes: timestamp function/staff attachment; chat threads,
  members, membership helper and two source-only SELECT/UPDATE policies;
  default work-location table/function/shops attachment; business-created team
  function/attachment. Existing staff/chat helpers now have concrete table edges.
- One explicit offboarding/audit writer-closure unknown, reachable from the
  member bridge. The broader chat-closure placeholder remains. Actual source
  FKs, incoming shop/business paths and the own-UPDATE SELECT dependency are
  declared; source-only paths are not called newly catalog-verified.
- Five narrowly dated function and three staff-attachment observations are
  added without closing owner/search-path/ACL, later supersession or writer
  authorization facets. Effective anon/auth denial is not trigger containment.
  All nine mandatory facets on every table stay unreviewed.
- Location bootstrap/register seeds are explicitly excluded. A separate unknown
  records mixed dated snapshots: observedAtUtc is the newest selected function
  observation, not an atomic complete database snapshot.

Current bounded scope:37 sources,8 evidence files (45 verified pins),86 objects,
74 reachable,201 declared edges,18 reported DFS back-edge cycles and566 unresolved
findings. Lineages:26 source-correspondence,6 unclassified,5 pending-forward.
New cycles include declared chat-policy/read and shop/default-location paths;
these are review obligations, not18 defects or an executable migration order.
Findings count repeated unknown facets/prerequisites, not completion percentages.
Global composed correspondence remains404/423 with19 unclassified, unchanged.

The CLI intentionally returns **exit1 / explicit_unknown_coverage**, with valid
structure and verified pins. Baseline/replay/applied-lineage/schema/data/ACL
parity/SQL-object-identity/attachment/release flags remain false. A fifth new
real-inventory regression checks reachable unverified nodes, retained unknown
facets, exact evidence identity, source-only attachments, SELECT dependencies,
seed exclusions and cycles. Focused metadata tests pass26/26 (174ms), lint passes.
Full sequential tooling passes220/220 (124.94s), focused lint/format/diff and
independent read-only review pass. Remote publication/checks are recorded below.

LF SHA-256 pins (UTF-8, CRLF-to-LF only; no trimming):

| File                              | Bytes  | SHA-256                                                          |
| --------------------------------- | ------ | ---------------------------------------------------------------- |
| baseline-native-scope-v1.json     | 102830 | c208edd504a456c4926c69b88d35a68057313be8d9e844ec843cb22ef11902bb |
| baseline-scope-inventory.mjs      | 21164  | ba2fc0c8f65f698cdb25903ded71189ca3881e7ad53ce585bf6ad5f45a870972 |
| baseline-scope-inventory.test.mjs | 29992  | d4deb073a2ae0b568454d56d9a2fc2bc1600096bff79daf2bad55265ad175412 |

These declarations are hand-reviewed and metadata-only. The validator does not
parse SQL, enumerate all platform objects, authenticate users, execute/replay
migrations or certify current production policy/writer parity. No source body
or production count is emitted by the report. No test result authorizes a
binding/duplicate/history repair, new grant or production rollout.

## Exact next dependency

The selected metadata/policy step below is now implemented in draft PR #36,
code `a5e141d`; see `NATIVE_CHAT_MEMBERSHIP_POLICY_PROOF.md`. This inventory's
declared graph/pins/facets remain unchanged and incomplete. The original bounded
requirements are retained below; the next resumption action is the six-writer
and message/notification boundary in `NATIVE_CHAT_WRITER_REHEARSAL_PLAN.md`.

Verify this publication's checks, then recover narrowly selected **catalog only**
metadata for current chat membership helper/policy composition and the retained
incoming shop/business plus shift/register/work-location attachments/indexes.
No business rows/counts, helper invocation, new grants or platform writes. Compare
only retained source that actually corresponds; do not replay a broad sweep or
infer a current policy from an old declaration.

Compose the selected actual chat SELECT/UPDATE helpers/policies on disposable
fixtures before claiming effective membership changes; a self UPDATE predicate
alone does not establish admission. Then develop the offline companion contract
from `NATIVE_STAFF_TRIGGER_COMPOSITION_PROOF.md`: immutable identity values/upsert
compatibility, self-shift/downstream effects, actual-owner protection, approved
delegation/deletion/invitation provenance, compatible atomic offboarding,
multi-roster scope and original-actor audit/concurrency. Missing source/metadata
must remain an explicit unknown, not an invented guard or elevated fallback.

Baseline/forward/private-storage recovery, real API/JWT/role/load/concurrency,
consent/tenure/financial retention, scanner recovery/owner/mobile pilot, trusted
entry/billing/retail/recruitment and hosting release gates remain open. Pending
bootstrap/totals approval is unchanged; do not repeat or apply it. Supabase
security/performance guidance kept dated observations separate from authority,
full closure and release acceptance. Migration impact: none. Deployment: none.
