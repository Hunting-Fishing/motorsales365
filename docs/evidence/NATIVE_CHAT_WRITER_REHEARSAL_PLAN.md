# Native chat writers: next bounded rehearsal plan

2026-10-15 Asia/Manila. Original retained-source plan, now implemented offline in
draft PR #37 (code `0d5ada9`). The six selected writers, five dependencies and
message/notification attachments are now observed and composed; see
`NATIVE_CHAT_WRITER_COMPOSITION_PROOF.md` for the exact dated scope, tests and
remaining synthetic public_profiles/role/API/delivery boundaries. The original
plan and evidence requirements remain below as historical design, not the next
instruction to repeat completed work.
This is the next dependency after the sixteen selected chat-policy tests in
`NATIVE_CHAT_MEMBERSHIP_POLICY_PROOF.md`, not another whole-project plan or a
production mitigation. This plan makes no application, SQL, permission, history
or production-state changes.

Those policy tests characterize actual command shapes, including constant
no-read membership updates and their filtered/RETURNING negative controls. They
do not execute these six definer writers, messages or notifications. Do not
inherit their acceptance or direct-table outcomes for an RPC with different
guards and side effects. The fresh catalog for two membership predicates is
also not a current observation of these six writer identities.

## Exact retained selections and pins

All source paths are under `supabase/migrations/`. Hashes use UTF-8 with
**CRLF-to-LF-only** normalization, no trimming or SQL normalization. Complete
CREATE OR REPLACE FUNCTION sections end at their closing `$$;`, without the
following transport newline. Body pins cover exactly the text inside the dollar
quotes, preserving its internal leading/trailing newlines. Each selected section
was found uniquely in its identified file; extraction must fail on ambiguity or
pin drift rather than execute a whole migration.

| Alias | Whole retained source                                   | Whole-file LF SHA-256                                              | LF bytes |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------ | -------: |
| W     | 20260711073454_cea6ce68-1eda-4711-8431-5d3468395289.sql | `5c7f708934cd5fd777a8f0c27c13df63d1a26304e4ec4b21b19dbb33b5c7c7c6` |     4250 |
| B     | 20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql | `67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4` |    10598 |
| U     | 20260711074001_e72c5982-744f-4023-9045-99a02778d52b.sql | `abb23565f14a66c0f576cc26589b8471e6300ddf2b62269ac7b717ad94031c50` |      699 |

| Exact function identity                       | Source lines, inclusive | Complete section LF SHA-256                                        | Body LF SHA-256                                                    | Body LF MD5 for future catalog comparison |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------- |
| public.create_group_chat(text,uuid[])         | W 39–78                 | `2aa4bd86c2abad744e91b3ee6374e48bc1d3afe1ba25e085a827ecd36fd1a4d0` | `179edb0f84179a66a16a4a5700d56a9c33359f3c041578f787464ccc265dfc24` | `3e73d9d337ca7f1c7b5b5322d0dc7ec2`        |
| public.invite_to_thread(uuid,uuid[])          | W 80–116                | `fd3b1875fbf4af9c2897b05186551778411972929cc2dc63d1d7a355e16ab744` | `2fe28ca762c1fa815371b472526e348354e73a8025856ca063d87ec1284143f2` | `510282e123f3d5bcb1ae8c851c1a2d09`        |
| public.respond_to_thread_invite(uuid,boolean) | B 242–258               | `6b3e0ff6aa9f3e082e67139a2244cd808545345e6c1801782a6d2ffb137bfcef` | `59c54d7df33821a0021bb4710d721101d98b2474e7926041da36884e2fe3fa79` | `2e42175e5de4cd38790463449b619015`        |
| public.leave_thread(uuid)                     | B 261–270               | `0784442eb7561c64abd45a703aacccf1a1e61db4322bebf18da39835f84dafab` | `c85082efb050afd259c65bb282a02a6f35ae558bacee162eca4f0c81eb549ab1` | `1a0360b056c42b69b6aa510187128a38`        |
| public.mark_thread_read(uuid)                 | B 273–282               | `45fbf4448eaa7979e31eb824bb6909e07e6457b0f7e812782f8f9271e785c2b8` | `661734f865cf257bd8302ad96cdc2d3ddc706021e9777caceee0ab7f6a574192` | `dc9feda2e2522833003d1f4c2cfd2658`        |
| public.mark_thread_unread(uuid)               | U 1–19                  | `d2b23fb9389b749e57d6852d800daac7e62c60e10c5d75c6ae56125a7b57923b` | `e45287cbafa2757f4de46fe53168c284b3bb4004a6b800975e7c3303c002e21b` | `0f7e56af07a7316b6fe7b1bea5825dae`        |

All six retained declarations are PL/pgSQL SECURITY DEFINER, public search_path,
with default VOLATILE behavior. These are source properties, not observed
current owner/security/config/ACL facts. W replaces the older B create/invite
bodies, including their notification column names; do not load both definitions
or claim retained filename ordering proves applied history.

The retained August security sweep
`20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql`, whole LF SHA-256
`d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321`,
does not revoke PUBLIC in its function ACL loop. create_group_chat,
invite_to_thread, respond_to_thread_invite and leave_thread are named in
keep_auth; mark_thread_read/unread are not. Its direct anon/authenticated
revocations alone cannot establish effective denial when PUBLIC/inherited
privileges remain. Neither source grants nor that sweep establish these six
current effective EXECUTE values; do not replay the sweep or infer exposure.

## Source-only writer contract and side effects

| Writer                   | Retained checks and changes; assertions still to rehearse                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create_group_chat        | Requires non-null auth.uid; trims/coalesces title and rejects empty. Creates thread, active creator membership, then invited memberships for non-null, non-self array entries. Returns thread UUID. Membership INSERT uses ON CONFLICT DO NOTHING, but notification INSERT is unconditional for each qualifying iteration: duplicate targets can attempt duplicate notifications. No SQL title-length or array-cardinality bound is declared. |
| invite_to_thread         | Requires non-null auth.uid and is_active_thread_member(thread, actor), not merely creator or business owner. NULL array returns 0 after those checks; empty array loops zero times. Inserts invited membership ON CONFLICT(thread_id,user_id) DO NOTHING; increments count and writes user_notifications only IF FOUND. Existing left membership is not reactivated by this source.                                                           |
| respond_to_thread_invite | Requires non-null auth.uid. p_accept=true updates only the actor's invited row to active and resets joined_at. ELSE, including p_accept=NULL, sets any matching own membership to left, without an invited-status condition. Returns void; no changed-row confirmation.                                                                                                                                                                       |
| leave_thread             | Requires non-null auth.uid, then sets the matching own row to left regardless of existing status. Returns void, including when UPDATE matches zero rows. No creator/business-owner distinction in this source.                                                                                                                                                                                                                                |
| mark_thread_read         | Requires non-null auth.uid, then writes now() to the matching own membership regardless of status. Returns void, with no match count. Does not mark notification rows read.                                                                                                                                                                                                                                                                   |
| mark_thread_unread       | Requires non-null auth.uid, reads max(created_at) from messages in the supplied thread excluding the actor as sender, then sets the matching own membership's last_read_at to NULL or that maximum minus 1ms. No membership predicate guards the message aggregate. Returns void, not message content or the aggregate; exposure/side-channel implications remain unverified.                                                                 |

The existing membership predicates are dependencies, not independent caller
authority. Actual creator, active/invited/left member and businesses.owner_id are
different identities/contracts; no implicit owner recovery or tenant equivalence
may be introduced to make a test pass. Missing/null thread inputs, physical FKs,
existing statuses and notification constraints must determine actual outcomes.

## Independently inspected application callers

These are current local source observations, not browser/HTTP/JWT acceptance:

- `src/components/messaging/new-group-chat-dialog.tsx` 26–49 checks a trimmed
  nonempty title and at least one picked member, calls create_group_chat at
  37–40, checks resolved error, then shows creation/invites success before a
  truthy data check invokes onCreated. Input maxLength=80 is a UI control, not
  a SQL title limit; returned data is cast, not validated as a UUID.
- `src/components/messaging/invite-to-thread-dialog.tsx` 28–47 checks nonempty
  selection, calls invite_to_thread at 34–37, checks resolved error and displays
  data??0 as the invited count. It does not strictly validate the returned count
  or establish notification delivery.
- `src/routes/dashboard.messages.tsx` 599–608 automatically calls mark_thread_read
  for the selected non-invited group. Its `.then(() => ...)` ignores a resolved
  RPC error and updates local last_read_at to a browser timestamp anyway. This
  source confirms a response-handling gap, not that an error occurred live.
- The same route's manual read/unread handlers 670–689 and accept/decline/leave
  handlers 703–735 check resolved error, then display success and reload. The
  four void writers do not report affected rows, so error-free RPC completion
  cannot prove a membership/read-state transition occurred.
- Group send at 767–781 directly INSERTs chat_thread_messages, requests a fixed
  returned projection and maybeSingle, then stores any returned row. It is not
  one of these six RPCs and must be included in later message-trigger acceptance.
  Its attachment fields do not authorize real file/upload/delivery tests here.

Do not fix these callers in this documentation slice or turn their current UI
filters into the database authorization boundary. A later bounded caller test
should cover resolved RPC errors, null/malformed data, void zero-row outcomes and
late results before claiming reliable UI confirmation.

## Exact evidence prerequisites before writer proof

Next, prepare/review metadata-only inspection for the six exact signatures above
and for **public.chat_thread_messages** and **public.user_notifications**. Do not
execute a query from this plan. Needed evidence is:

1. Exact writer identity/arguments/defaults/return shape, owner, language,
   volatility, security mode, full definition/body fingerprints, configuration
   keys/fingerprints (safe search_path text; hash other values before publication),
   raw ACL and effective anon/authenticated/service EXECUTE. Compare body pins;
   stop the claimed correspondence on mismatch and recover the actual source.
2. Both relations' owner/RLS/FORCE flags, complete columns/types/nullability/
   defaults/column ACLs, table ACLs, current policy roles/commands/predicates,
   validated constraints and rendered indexes.
3. Complete non-internal attachment identities/events/UPDATE columns, WHEN and
   argument fingerprints/counts, enabled state and attached function metadata;
   review any needed raw expressions privately before saving, never disclose
   sensitive trigger arguments/configuration. Then recover exact called
   notification dependencies needed to reproduce those selected side effects.
   Preserve every genuine unresolved dependency instead of a permissive stub.

Known retained candidates, **not a verified current attachment list**, include:

- B messages DDL/grants/RLS/index at 27–43, read/send policies 97–103,
  tg_touch_chat_thread 106–112 and attachment 113–115, notification attachment
  trg_notify_chat_thread_message 153–155. W 2–37 replaces the latter function
  body to use category/link_url/entity fields.
- `20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql`, already pinned in
  the policy proof, adds another named message notification path:
  trg_thread_message_notify 189–207 and thread_message_notify 210–212, calling
  notify_user. Its DROP targets its own trigger name, not the older differently
  named attachment. Do not assume replacement, one notifier, duplicate delivery,
  or current presence without the actual catalog.
- `20260620175446_5053a902-248b-4600-bef6-8a9c84c28cd8.sql` has notification
  DDL/index/grants/RLS/policies 53–77 and 108–112, lock-columns function 80–100
  and BEFORE UPDATE attachment 102–106 with a role-setting WHEN condition.
  Current schema/trigger correspondence and all later changes remain to verify.

The prior two-table chat metadata and six-table business/shop incoming metadata
do not cover these relations or these six writer functions. Their scopes/times
must remain separate, not an inferred atomic current-state baseline.

## Bounded disposable rehearsal contract

After the evidence prerequisites are recovered, implement a new focused
memory-only, sequential, always-finally-closed PGlite writer suite. Reuse the
selected unchanged chat table/helper/policy controls where appropriate; add
actual selected notification/message DDL, critical constraints, attachments and
functions. Keep auth/session and any reduced supports explicitly synthetic.
Use non-superuser/NOBYPASSRLS actor roles, distinguish effective EXECUTE denial
from body authorization, and snapshot stored rows plus selected catalog/ACL state.
Use bounded test/statement/lock timeouts; no credentials, network, installs,
persistent databases, full migration replay, seeds, backfills or live writers.

Suggested compact test groups:

1. Null-subject/anon/authenticated and active/invited/left/absent caller controls;
   creator without active membership versus active noncreator; actual business
   owner without membership versus an ordinary member. Verify each real guard,
   not an assumed shared authority contract.
2. Create title NULL/empty/whitespace and normal title; NULL/empty member arrays;
   self/null entries and duplicate targets. Assert thread/member/notification
   multiplicity and exact returned UUID. A small bounded larger-array control
   may characterize behavior, but the source has **no declared maximum**;
   do not invent a cap or run a resource-exhaustion test.
3. Invite NULL/empty/duplicate arrays, mixed new/existing/left users and missing
   auth-user targets. Check count equals new membership insertions, existing-left
   remains left, and actual notification multiplicity. Do not equate integer
   insertion count with delivery or direct-table upsert permission.
4. Respond true/false/NULL for invited/active/left/missing rows, joined_at changes
   and repeated calls. Verify NULL follows the decline branch; distinguish true
   invited-only transitions from successful void no-ops.
5. Leave and mark_read for each membership status, missing/null/cross-thread
   IDs, repeated operations and other-user negatives. Inspect stored state under
   fixture setup authority separately from what the actor can SELECT afterward.
   Void result alone is never changed-row confirmation.
6. Mark_unread with no messages, self-only messages, other-sender timestamps and
   messages outside the requested thread; missing/left/invited own membership
   versus stranger. Assert exact max-minus-1ms/NULL behavior and no unrelated row
   changes. It internally reads messages without membership validation, but
   returns no content/aggregate: keep any exposure claim bounded to actual
   demonstrated observations rather than infer a private-content leak.
7. Atomic rollback with **real** notification FK/NOT NULL/CHECK/unique and actual
   message/notification trigger constraints. Use valid earlier work then a later
   invalid recipient/notification outcome; assert exact error and explicit
   rollback of thread, memberships, messages and notifications. Do not widen
   constraints, remove an enabled attachment or invent a failure trigger and
   call it current behavior. Characterize direct message INSERT/RETURNING and
   its real trigger chain separately from the six RPC calls.

Do not repeat all sixteen policy cases or the completed staff offboarding suite.
Keep the new proof's source/header/ACL reproductions and selected catalog
comparisons explicit. PostgreSQL engine/version and single-session limitations,
real JWT/PostgREST transport, independent-session concurrency, delivery workers,
email/push/realtime/storage and production data integrity remain outside this
memory proof. Notification rows are not platform notification delivery.

## Next action and release boundary

The immediate dependency is the reviewed narrow metadata recovery above, then
unchanged-source writer rehearsal with real message/notification constraints.
Local implementation of that disposable proof can continue under the existing
authorization; it does not require a production release approval or another
routine permission request. Do not skip missing evidence by stubbing a writer.

No current writer catalog parity, affected production records, incident,
mitigation, new permission or commercial outcome is asserted. All production
authority, complete writer/dependency closure, concurrency, baseline/recovery,
retention/consent, real API/role/mobile/pilot and hosting release gates remain.
This source-plan component executes no query or business operation. The enclosing
policy slice records tests and publication in its separate proof document.
