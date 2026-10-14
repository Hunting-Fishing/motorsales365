# Native chat writers and message/notification composition

2026-10-15 Asia/Manila. Selected unchanged-source disposable characterization,
not a production mitigation, current data assertion or complete authority proof.
Branch `security/native-chat-writer-composition`, stacked on PR #36 docs
`2844477`; all six parent CI gates passed (run `38654334163`), verified here.

Draft PR #37: `https://github.com/Hunting-Fishing/motorsales365/pull/37`, code
`0d5ada9`. Full sequential tooling passes 259/259 (164.79s), focused lint/format/
diff and independent review pass. Remote CI awaits verification on the published
documentation head. No application or production release is claimed.

## Bounded current observation

The independently reviewed `native-chat-writer-catalog-review.sql` ran once at
`2026-10-14 23:34:25.907315` UTC. It reads only catalog metadata for two exact
public tables, six exact writers, the exact notify_user dependency and attached
functions. No application records/counts, function/RPC invocation, message,
notification delivery, DDL, grants or permission/data/history/platform mutation.
The query does not enforce READ ONLY transactions or timeouts and does not share
a snapshot with earlier metadata. Raw expression text was independently reviewed
before publication: ordinary defaults/policies/constraints/indexes only, with no
record IDs, credentials or sensitive literals. Bodies, argument defaults, trigger
WHEN/arguments and non-search_path configuration values are hashes, not raw text.

The dated artifact `native-chat-writer-catalog-2026-10-15.json` contains:

- Two postgres-owned RLS-enabled/non-FORCE tables: chat_thread_messages and
  user_notifications. Complete selected columns/defaults/column ACLs, table ACLs,
  validated constraints, indexes and policy sets are captured. These are dated
  metadata, not all upstream/outgoing FK, role/default privilege or data parity.
- Eleven matching retained function bodies. All are postgres-owned PL/pgSQL,
  VOLATILE, search_path public; only tg_touch_chat_thread is SECURITY INVOKER.
  The six writer functions deny anon and allow authenticated/service EXECUTE,
  with no PUBLIC entry. notify_user and four attached trigger functions deny
  both client roles and retain service EXECUTE. Effective EXECUTE denial does
  not disable automatic trigger execution; these are not hosted API tests.
- Three enabled message AFTER INSERT/ROW attachments: thread_message_notify,
  trg_notify_chat_thread_message and trg_touch_chat_thread_on_message. Both
  differently named fanouts actually coexist at this observation; no assumption
  that the newer name replaces the older attachment is made.
- One enabled notification BEFORE UPDATE/ROW guard,
  trg_user_notifications_lock_columns, with its WHEN/argument fingerprints.
  The retained guard does not protect id and its WHEN reads a role setting;
  neither its name nor that setting establishes immutable original-actor access.
- Only notify_user has a default argument. Its rendered default-expression MD5
  is from pg_get_expr(proargdefaults,0), not a pg_node_tree parse-location hash,
  raw source-byte hash or semantic-equivalence guarantee across versions.

LF SHA-256 is UTF-8, CRLF-to-LF only, without trimming:

| Artifact                                   | Bytes | SHA-256                                                          |
| ------------------------------------------ | ----: | ---------------------------------------------------------------- |
| native-chat-writer-catalog-review.sql      |  8791 | 7020c6b483dd2d1e08b3d482b3aa4f6ff5e885a11fef554ecf70a7d0656d8cbc |
| native-chat-writer-catalog-2026-10-15.json | 24965 | d30e32e7e678860c89252c31fae045ce7a7c574ed4683d47ca5c7414bba73c6f |

Three separate fast artifact tests pass and pin these exact files, canonical project/time/
function/relation/attachment sets, privilege/config/default distinctions and
hash-only protected values. Static checks cover the manually reviewed hashed
SELECT only; they are not a general SQL parser, sandbox or remote executor.
The static test file `native-chat-writer-catalog.test.mjs` is LF SHA-256
`551c1e8cebc259b41bee38c0c7113c546efcdc60421e401dd3fe122373b70964`,
5196 bytes. CI adds a dedicated never-quarantined memory-only gate for it and the
composition proof below.

## Selected source and fixture boundary

`NATIVE_CHAT_WRITER_REHEARSAL_PLAN.md` retains the six writer source/section/body
pins, caller observations and original bounded test plan. All selected original
SQL remains unchanged; no full historical replay, broad ACL sweep, realtime
publication block, seeds/backfills, staff/native/business incoming path or
permissive writer stub is allowed in this proof.

The public_profiles lookup remains outside the current catalog scope. Any
reduced auth/session/business/sender-profile projection used by the disposable
fixture is explicitly synthetic and cannot establish current view/underlying
profile RLS, original-human authorization or complete caller/dependency parity.
Notification rows are not email/push/realtime/platform delivery evidence.

## Verified disposable outcomes

`scripts/ci/native-chat-writer-composition.test.mjs` pins five whole retained
sources, thirty complete selected sections (including six original EXECUTE
grants) and thirteen function definitions, including the two earlier membership
predicates. Fifteen sequential always-finally-closed tests pass (17.079s), with
own-file ESLint/Prettier and independent read-only review clean. LF SHA-256
`5ddb1e91ab07fefc80b049446702c50b76e641f93808c42754c2c6d1f2df90dc`,
43082 bytes. Original selected DDL/grants/functions/policies/attachments execute
unchanged. Additional narrow ACL reproduction is explicitly fixture-only,
including the different saved service/auth grant ordering for read/unread.

| Synthetic operation/control                 | Verified stored outcome                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Six writer permission/body controls         | Anon fails EXECUTE with 42501; authenticated null subjects reach each real body guard and fail with P0001. Client denial of notify_user/trigger functions is distinct from automatic invocation.                                                                                                                                                                               |
| Create with trimmed title/duplicate targets | One invited membership but two stored invitation notifications for a repeated target. NULL/empty/whitespace titles fail; NULL/empty arrays create only the creator. A 96-character title is accepted: the UI 80-character cap is not a SQL declaration.                                                                                                                        |
| Invite versus creator/owner/left status     | Active noncreator succeeds, count reflects only new inserts; duplicate/existing-left targets do not count or reactivate. Invited creator, actual business owner without membership, left and absent members fail.                                                                                                                                                              |
| Accept/decline/repeat/no membership         | True activates only invited rows and changes joined_at; false and NULL set any own status to left. Repeated/missing targets can return the same void SELECT shape without changing state.                                                                                                                                                                                      |
| Leave/read and notification read-state      | Own active/invited/left rows can be updated; missing/null/cross-thread misses are void no-ops. mark_read writes the transaction's now(), not notification read_at.                                                                                                                                                                                                             |
| Mark unread                                 | Other-sender maximum in the exact thread minus 1ms, or NULL for no other messages. Own left status still updates; self/later other-thread messages do not affect that maximum. Stranger/missing membership returns no content/aggregate and changes no rows; no private-content leak is inferred.                                                                              |
| Direct message with all three attachments   | Both chat_message and team_chat rows are inserted for the other active member on team and ordinary group threads. Active noncreator sends without changing thread.updated_at; creator sends do update it. Invited/left members receive neither fanout.                                                                                                                         |
| Message policy/physical controls            | Invited can SELECT messages but cannot send; active cannot spoof sender. Left/stranger/null sends fail; source UPDATE/DELETE affect zero. Actual attachment CHECK, sender FK and PK failures preserve prior state after explicit rollback.                                                                                                                                     |
| Notification UPDATE boundary                | Own read_at succeeds, other-user write affects zero, all nine listed protected fields fail. Own id replacement succeeds because the actual guard omits it; this is a characterized gap, not read_at-only acceptance or mitigation.                                                                                                                                             |
| Privileged physical controls/atomic failure | Client notify_user remains denied; real definer fanout succeeds. Explicit operator-only default/NULL metadata controls yield {}, NULL recipient no-ops. Later real membership/notification FK, notification NOT NULL/PK and message CHECK/PK/FK errors roll back earlier actual inserts, fanouts and timestamps. No invented failure trigger or constraint relaxation is used. |

The pinned reviewed SELECT also runs only against each disposable fixture to
compare all eleven full function API/default/config/body/definition/security/raw
ACL records and exact two-table/four-attachment metadata. PG18 NOT NULL constraint
representation alone is excluded after every column nullability/type/default/
column-ACL field matches. Earlier chat controls use their separate source/dated
observation; this does not combine observation times into live atomic parity.

Failure snapshots cover all seven fixture relations plus selected table/column/
schema/function/default ACLs, indexes, constraints, policies, attachments and
four fixture roles. They do not cover every platform object, role inheritance,
all native profile/view policies, service/operator entry paths or original-human
authority. Actor sessions are non-superuser/NOBYPASSRLS; privileged physical
controls are expressly not client-authorized operations. PGlite0.5.9 reports
PostgreSQL18.6, not hosted authentication, real independent-session concurrency,
CI's separate Parts PostgreSQL17, production load/integrity or delivery.

Full sequential command:

`node --test --test-concurrency=1 scripts/ci/*.test.mjs scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`

## Release and next dependency

Migration impact: none. Deployment: none. The application remains the previously
CI-verified 723-test parent. Historical SQL and all production state are unchanged;
selected inventory/global source-correspondence and false release/parity/replay/
baseline flags are not promoted. Hosting remains separately blocked and the
sparse local artifact must not deploy. Pending bootstrap/totals approval is
unchanged; no repeated prompt or automatic application follows these tests.

After this selected writer proof is verified, implement the separate bounded
caller acknowledgement/error/late-result contract: automatic mark-read must not
invent success after a resolved error, UUID/count responses require validation,
and void results must not be described as confirmed row transitions. Preserve
the native authority guard's original-actor, immutable identity, delegation,
owner recovery, self-shift, multi-roster, valid atomic offboarding and concurrency
requirements. A client request shape or notification inbox is not tenant authority.

Complete source/view/role/writer closure, separately reviewed baseline/forward/
private-storage recovery, real API/JWT/concurrent-session/load/role acceptance,
consent/ownership-tenure/retention, original scanner recovery/owner/mobile pilot,
trusted entry/invoicing/retail/recruitment and hosting release gates remain open.
Supabase security/Postgres guidance kept direct execution, automatic side effects,
row visibility, immutable source correspondence and release acceptance separate.
