# Selected organization function source recovery

2026-10-15. Current catalog-derived reference source only: **not recovered original
migration history, an accepted baseline, repaired authority or behavioral proof**.

PR #55 mapped 25 of 28 selected public function bodies to retained SQL files but
left three organization functions without retained CREATE definitions. This
separate slice closes only their current-definition reference gap. Original
organization/member/org-role DDL and the member-tier critical-table frontier remain
open. Historical source classification remains 404/423 matched, nineteen
unclassified; no provenance/replay/parity/release flag changes.

## Narrow, privacy-gated read

`scripts/ci/org-function-source-review.sql` was reviewed and tested before its
single successful READ ONLY execution at **`2026-10-15T07:38:31.452256` UTC**,
project `wjxaajgvddtrxxtocxen`, PostgreSQL 17.6. It uses the trusted catalog search
path, 5-second statement/1-second lock timeouts and ROLLBACK. No application/auth
rows or counts, helper execution, sequence access, settings values, arbitrary
function dump or production mutation occurred.

Exactly three previously fingerprinted signatures are selected. Definitions stay
NULL unless prior body MD5, complete definition MD5/length, owner, function kind,
language, SECURITY DEFINER, no argument defaults/set-returning result and exact
public search path agree. Bodies are bounded below 1,024 bytes. Additional guards
reject sensitive markers, URLs/email-like values, nested dollar quotes and
unexpected string literals. Literal roles are limited to owner/admin/manager/
member/viewer. The fixed header may contain only the known public path.
These are layered guards, not a general secret scanner or authorization for any
body dump. The primary agent then reviewed all three returned definitions before
saving/showing them: structural membership/creator code and role literals only,
with no secrets, account ids, email addresses, URLs or customer/config values.
The sole configuration text in a returned header is the already verified fixed
public search path; no other raw configuration or settings values are returned.
No new authority or production action is inferred from that review.

The output `org-function-source-2026-10-15.json` is canonical two-space JSON,
LF/byte/SHA pinned. It is intentionally distinct from the unchanged PR #55
fingerprint-only artifact. That older capture is not relabeled as source recovery.

| Artifact                                            | UTF-8 LF bytes | SHA256                                                             |
| --------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/org-function-source-review.sql`         |          3,227 | `990178e0bd09eb3c1812655f14b7c51ceb83cb65ba0e0b7dacfe0adab768150c` |
| `docs/evidence/org-function-source-2026-10-15.json` |          2,555 | `a4e4aad2d5fff5ef16b008e04c930a449d578698434101d010fb657e25b18f98` |

## Exact recovered semantics, not application adoption

| Function                               | Body MD5 (LF)                      | Complete definition MD5 / bytes          |
| -------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `public.can_manage_org(uuid,uuid)`     | `4b54f3895e3fab6350dea558838bdd05` | `935d3e6f96bf9ff0bef97b72bb8d0960` / 369 |
| `public.is_org_member(uuid,uuid)`      | `cefe2097db7339afc78a8e4bbb665c4b` | `d9dc0bcc29c9dc6b890100871fa617e4` / 330 |
| `public.tg_org_add_creator_as_owner()` | `866cb0936b4e0fb9f8babcbc24482324` | `c1ea913652a5e36a8b096f50678c7cb9` / 436 |

Both boolean helpers read membership for supplied user/org UUIDs. The management
helper allows membership roles **owner or admin**, not manager merely because that
enum label exists. Neither helper adds its own `auth.uid()` comparison. These are
source facts; the caller/policy context, existing execute grants, original human
actor, cross-org authority and hosted access are not newly verified or repaired.

The creator trigger inserts owner membership when created_by is non-NULL. On an
existing org/user conflict it **updates role to owner**, not DO NOTHING. Future
composition must reproduce that actual effect and its real constraints/attachment;
a guessed no-op/ignored conflict would conceal behavior. No business ownership or
native Shop Manager authority is adopted from this platform organization model.

The definitions are data/reference evidence only here. They were not executed as
bootstrap behavior in a synthetic reduced schema. No original DDL was guessed,
genuine FK removed, helper stub substituted or seed/backfill replayed. Existing
trusted-source body correspondence and this current-catalog source have different
provenance and remain explicitly labeled.

## Offline verification

Eleven focused contracts pass (4.647 seconds), with a dedicated never-quarantined
serial CI step. They cover query read-only/scope controls, empty-catalog parsing
and local-setting rollback, mismatched-fingerprint denial, and fail-closed privacy
guards for unexpected literals, sensitive markers and nested dollar quotes. A
deliberately synthetic diagnostic function under a selected signature is used
only to exercise the query gates: its fingerprints are substituted in the **local
test query**, never in the production query. Its deliberate exception proves the
source read does not execute the helper. This is not an organization authority or
bootstrap fixture and does not implement current helper semantics.

Static retained-source tests verify exact full/body fingerprints, lengths, dated
capture pins, privacy surface and the actual owner/admin/membership/conflict
semantics. No current organization function is invoked for behavioral acceptance.
Syntax, lint and source/CI formatting pass; canonical JSON is independently pinned.
Primary review only: unchanged quota-blocked subagents were not retried and no
fresh independent final audit is claimed. Supabase safety guidance kept live
source recovery read-only and tests disposable, with privileges/RLS/source/actor
authority kept separate. No migration, deployment or customer communication.

## Next dependency and release status

Recover the actual organization/member/org-role current structure and critical
member-tier table using separately reviewed bounded structural definitions or
retained original source. Current catalog-derived structure must stay labeled as
such; it does not resolve original migration provenance. Then compose the ordinary
no-referral auth flow with actual profiles/orgs/members/plans/subscriptions/
sequence/intent/admin-audit effects and genuine critical constraints, not reduced
success stubs. Validate late failures, recovery and incoming/offboarding behavior
before adopting privileged positives. Nonempty referrals, original actor/revision/
common writer locks, native authority and consent remain separate dependencies.

PR #55 docs `ec8ea7a` currently passed build/type/OCR/lint/Parts, with unit tests
pending (`38699776700`); hosting `3c9d168d-4d80-4564-91ea-89a3d3a3adc7` failed
separately and wrapper `38699776783` skipped migrations/production deployment.
PR #54 docs `b415d4b` passed all six gates. Its 1,207 app tests/TypeScript are parent
evidence, not fresh bootstrap proof; this source-only slice changes no application
code and claims no new full app run. New source PR must pass its own checks.

Independent retained-source mapping recovered the member-tier CREATE at
`supabase/migrations/20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql:145`
(whole-file LF SHA256 `c7479d534318d06b6fc9444098215a5719582987f79bc05d98c2591e9735938b`)
and profile tier default/FK at
`20260615041003_2a252442-7543-45ae-b1b5-dc6302e72f01.sql:37`
(SHA256 `32cf0c68394170ae2364a85a2559a9820e1cdf63cf7d3d77b6a9950a589d4a94`).
The retained default is `common`: real tier metadata and an explicitly justified
configuration-row prerequisite must be composed, not silently NULLed or removed.
No tier/plan/config row was read or seeded live, and the historical seeds were not
executed or adopted. This narrows the next recovery step without changing the
current source-recovery query or any immutable prior fixture.

Preserve all three approved live helper restrictions without replay; quote
conversion is outside them. No paid provision/charge, live DDL/DML/privilege/history
change, user-data deletion or PR merge. No sparse artifact deployment. Remaining
native/private-history/consent/receipt/mobile/owner/full-media/recovery gates and
the existing single recurring continuation remain active. Full regression and
publication evidence follow below after completion.

## Published checkpoint

Draft [PR #56](https://github.com/Hunting-Fishing/motorsales365/pull/56), code
`51cb641c589053c3b5a16a0febbac23d958c3117`, branch
`security/org-function-source-recovery`, stacked on PR #55 docs `ec8ea7a`.
Eleven focused contracts pass (4.647 seconds); full serial tooling **497/497**
passes (370.051 seconds), then receipt assets **10/10** separately (0.290 seconds):
**507** aggregate, zero failures/skips/cancellations. Syntax/lint (zero warnings),
source/CI/Markdown formatting, canonical pinned JSON, diff and primary review
pass. No test/quarantine/timeout or genuine constraint was relaxed. Test file:
`scripts/ci/org-function-source-review.test.mjs`, 9,009 UTF-8 LF bytes, SHA256
`23b3389fbbe5318eaf8d3c079dee3d8471619670a1d9a0537965bbe66f03b1a5`.

PR #55 docs `ec8ea7a` now passed all six CI gates (`38699776700`), superseding
its pending-unit snapshot above. Hosting failed separately and deployment/
migration wrappers skipped. New PR #56 requires its own latest-head checks.
Migration impact **zero**, deployment **none**, exactly one selected read-only
source recovery for this slice. No production mutation or PR merge. First slice
PR #55 had two catalog-only reads, so this logical heartbeat performed **three
successful READ ONLY diagnostic executions total**, not a live application test.

Exact next action: selected current org/member/org-role structure and member-tier
metadata/source recovery, then actual no-referral bootstrap composition with all
critical constraints and defaults. The three current org definitions need not be
recovered again; original DDL/history provenance remains open and is not silently
adopted from this catalog-derived source. Preserve independent nonempty-referral,
actor/native/consent/recovery and release gates plus the single continuation.

PR #56 code CI `38701141237` has lint/Parts passed, build/type/OCR/unit pending.
Hosting `78293363-0ee3-41a4-b593-301dab687f77` failed separately; wrapper
`38701141313` skipped migrations/production deployment. Later documentation
HEAD needs fresh checks. No passing build/preview wrapper is a production upload.
