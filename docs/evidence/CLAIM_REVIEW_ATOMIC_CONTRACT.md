# Claim decisions: preparatory command contract and atomic-writer prerequisites

2026-10-15 Asia/Manila. **Preparatory, unwired code and proposed transaction
requirements, not a new review endpoint, accepted authority model, database
implementation or production repair.** Published draft
[PR #49](https://github.com/Hunting-Fishing/motorsales365/pull/49), code
`f6bf32efacb837dd570f4a0397ed1e0826eb2e9a`, branch
`security/claim-review-command-contract`, stacked on PR #48 docs `6389eac`.
PR #47 docs `8b1b38e` and PR #48 docs `6389eac` passed all six CI gates
(`38681676475`, `38682112982`), verified on this follow-up; hosting failed
separately and migration/production deployment wrappers skipped.

## What this slice does and does not deliver

The new server-only-by-convention pure codec validates a proposed browser command, compares
its expected account with a separate middleware-supplied actor identifier, and
produces an immutable canonical payload/fingerprint. No current handler, route,
Supabase client, SQL/RPC, credentials, executor, ledger or confirmed receipt uses
it. Supplying a UUID to this function does not prove that middleware authenticated
it. Object freezing, canonical JSON and SHA256 are neither authority nor signed
actor attestation. Runtime worker integration is not tested by Node unit tests.

The existing `business-claims.functions.ts` remains byte-unchanged; new mocked
tests exercise its actual review handler rather than replacing its behavior with
the earlier SQL analogue. Passing characterization does not accept its errors,
authorization, no-ops, audit or idempotency as correct business policy. PR #48's
truthful ACK UI remains on that legacy handler; this codec is deliberately not
wired to it or used to fabricate a confirmed decision response.

## Proposed request identity

Version 1 requires requestId, expectedAccountId, claimId, businessId, an explicitly
present nullable expectedOwnerId and approve/reject decision. Optional notes are
bounded to 2,000 JavaScript UTF-16 code units; absent/undefined notes normalize to NULL, while explicit text,
including empty/whitespace/Unicode, is preserved. Browser actor/reviewer/role/
auto/tenant fields are rejected rather than trusted or silently stripped.
Explicit NULL notes, NUL and unpaired UTF-16 surrogates are rejected, not replaced
or silently normalized at a future UTF-8/database boundary.

The future persistence key is `(middleware actor, requestId)`. Canonical payload
contains version, actor, business, claim, prior-owner expectation, decision and
normalized notes, with canonical UUID spelling and a fixed field order. requestId
is excluded from that payload hash because it is the separate lookup key;
expectedAccountId is excluded only after equality with the separate actor is
checked. Same key with a different payload must be a conflict in the future
ledger, not a second decision. Equal fingerprints do not prove storage, execution,
commit, request uniqueness, role freshness or cryptographic authentication.

This contract prevents syntax/identity ambiguity only. The supplied business and
owner expectation remain untrusted assertions until compared with locked current
database state. It does not invent a shop/tenant mapping from business, email,
phone, mutable role label or native legacy profile identifier.
Matching values are not a trusted revision: rejected → resubmitted → pending,
changed evidence, or owner A → B → A can restore the same tuple. This draft codec
has no trusted attempt/evidence/tenure revision field and is not ready to wire
until that protocol and corresponding versioned request fields are reviewed.

## Required atomic database boundary before wiring

These are review requirements, not an adopted SQL design or authorization grant:

1. Verify the original authenticated human/session through a reviewed transport.
   Revalidate permitted decision authority against trusted assignment provenance;
   neither a service key/SQL owner, NULL subject, client GUC, matching expected
   account nor a syntactically valid actor UUID is the authority. Distinguish
   platform `public.user_roles`/can_moderate from native `shop_manager.roles` and
   `shop_manager.user_roles`. Native catalog prototypes do not prove ordinary
   users can write the platform role table; its own RLS/writers need separate
   closure. No new privileged positive branch is accepted by this codec.
2. Bind a durable ledger key to the exact actor and canonical payload in the same
   transaction. Duplicate identical committed requests may return the recorded
   result; mismatched payloads fail closed. Fresh authorization/revocation and
   minimal receipt-read rules require explicit review. Replay must inspect the
   stored result before reapplying pending/prior-owner preconditions already
   changed by its original committed decision, without relaxing current receipt-
   read authorization. A JavaScript hash/map is
   not this persistence or concurrency guarantee.
3. Use one bounded, consistently ordered transaction across decision and competing
   entrypoints. A proposed order begins with the actor/request ledger gate, then
   business rows in UUID order, selected/sibling claim rows in UUID order and
   required old/new profiles in UUID order, before any owner change. This order
   is provisional: actual incoming FK, trigger, team/shift/native/consent writers
   and their locks must be composed before declaring it deadlock-safe. No external
   HTTP/auth/storage call belongs inside held database locks. Use bounded lock/
   statement limits and rehearse independent-session conflicts, not just PGlite.
4. After locks, require exact claim/business binding, pending status and expected
   prior owner with NULL-safe comparison. Read claimant/kind from current trusted
   rows, not client claims. Define ordinary unowned-claim versus transfer authority
   without treating stale owner values or mutable role names as delegation. Missing
   profile/native bindings fail according to a separately reviewed policy; no
   implicit profile creation, native identity merge or owner reentry is invented.
   Bind decisions to a separately reviewed immutable claim-attempt/evidence and
   ownership-tenure revision; current updated_at has not been proved immutable
   or monotonic. A replay must retain the original stored decision episode, not
   act again on a later resubmission with the same claim UUID.
5. Update status/reviewer/notes/decision time together so the real status-audit
   trigger sees the bound reviewer during the decision, not a later unchecked
   request. Verify exact affected/returned rows. Approval must confirm the expected
   owner transition; rejection must not silently undo another owner's decision or
   treat failed/unknown pending counts as zero. Sibling effects need declared,
   attributable semantics and the same locked business decision boundary.
6. Compose owner-intent/profile effects and a mandatory decision audit in that
   transaction. PR #47 proves the existing auxiliary intent audit can fail and be
   swallowed; it is not sufficient as mandatory security audit. Define precisely
   which audit is essential, hard-fail/roll back its failure and retain original
   actor, request, previous owner, target claimant and exact decision provenance.
   Do not reinterpret an automatic target-as-actor entry as the original human.
7. Reconcile or block native staff/profile/role/shop-access effects, offboarding,
   linked private-vehicle consent and ownership-tenure invalidation before a
   transfer is described as complete. Existing owner_id UPDATE alone does not
   establish those effects. No consent, financial-history access, delegated owner
   invitation, multi-roster policy or native owner positive is invented here.
8. Persist an exact, bounded confirmed result with the ledger before commit. Only
   a separately verified receipt contract may drive confirmed UI success. A lost
   response requires authorized receipt inspection under the same key, not an
   automatic new key or assumption of rollback. No confirmed result codec or
   executor is supplied in this preparatory slice.

## Competing entrypoints and release gates

Review, auto-approved submission, rejection/reset, resubmission, transfer request,
direct owner edits and privileged/background owner/claim writers must share the
adopted decision boundary or be explicitly fenced. Retained approval SQL is
service-only but its service callers still matter; revoking clients alone does
not stop a privileged indirect caller. The current status audit prefers a stored
reviewer, which is why later separate stamping cannot repair earlier attribution.
Original trigger sources and constraints remain unchanged by this slice.
Competing INSERT/resubmit/direct-table paths must join the adopted protocol or
be fenced: a parent row lock/FK lock alone does not repair a stale RLS predicate
or establish protection from every new sibling-claim phantom.

The bounded source audit also corrects an earlier documentation error: retained
`public.has_role` May 1 source lines 45–56 match both saved catalog bodies exactly.
New static tests pin that mapping, not application execution or applied history.
Frozen PR #45 fixture bytes/comments and dated observations remain unchanged;
the historical mismatch comment is superseded, not evidence of a current mismatch.

Bounded source entrypoints (not an exhaustive dynamic/remote-caller inventory):

| Competing writer                                   | Retained application evidence                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contact-verified auto submission and manual review | `src/lib/business-claims.functions.ts:23`, `:102` — only two static application callers of legacy approval RPC found                                                                                                      |
| Resubmit and transfer submission                   | Same file `:325`, `:538` — separate checks/writes, stable claim IDs can span episodes                                                                                                                                     |
| Direct browser owner edit                          | `src/components/admin/transfer-business-owner-dialog.tsx:230` — returned owner row, not ledger/native reconciliation                                                                                                      |
| Business creation/import                           | `src/lib/businesses.functions.ts:123`, `src/lib/dispatch.functions.ts:272` — no proven existing-owner overwrite from duplicate-ignore import                                                                              |
| Platform role assignment                           | `src/routes/admin.users.tsx:436`, `src/components/admin/edit-user-dialog.tsx:63`, `src/components/admin/edit-profile-dialog.tsx:225`, `src/routes/api/admin/create-user.tsx:82` — actual RLS/service custody need closure |

Current platform-role INSERT attachments include a source-matching staff-referral
writer that reads auth/profile identity and writes referral state; sales-specific
attachments have further dependencies. Do not silently stub these for assignment
positives. The current auth bootstrap attachment/body was not captured in PR #47;
latest retained bootstrap source alone does not establish live role-seeding order.

Native/global-role and manual recompute authorization are separate dependency
closures. Baseline/forward upgrade/recovery, source-history provenance, real
JWT/API/session/role freshness, independent concurrency, consent/tenure/private
retention, receipt/mobile/owner pilot and full-media hosting remain release gates.
Do not deploy the sparse checkout or promote baseline/replay/parity/release flags.
The three already-applied legacy restrictions are preserved without replay.

Supabase/Postgres safety skills kept implementation unwired and separated request
syntax from RLS/privileged execution and original-human authority. Current
changelog review identifies future TLS/SDK/PG upgrade considerations, not authority
to upgrade/provision/migrate. Primary references:
[Supabase roles and service bypass](https://supabase.com/docs/guides/database/postgres/roles),
[PostgreSQL explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html),
[PostgreSQL character limits](https://www.postgresql.org/docs/18/datatype-character.html).

## Verification and exact next action

45 final focused application cases pass (2.21s): 25 pure syntax/binding/fingerprint/
text/immutability/explicit-revision-limit cases and 20 unchanged actual-handler
characterization cases. Three static platform-role source/body contracts pass.
Full serial tooling passes 408/408 (317.517s), followed by 10/10 receipt-asset
checks (0.440s), 418 total in separate consecutive commands; no failures/skips/
cancellations. Final full serial application suite passes **1,113/1,113 across
57 files** (88.47s), no failures/skips/quarantine. Final full TypeScript passes;
ESLint has zero errors/warnings. Syntax/format/diff and independent final source/
prototype-cleanup/contract/test/document review pass.
CI adds a static source-correspondence step and a dedicated never-quarantined
focused caller/command step; neither invokes a production service/database.
Final review also prevents inherited host-prototype notes from supplying an
absent request field; a bounded synthetic test restores the original descriptor
in finally. This is input isolation, not authentication or a trusted capability.
The new current-handler cases distinguish returned error objects from rejected
promises: the legacy approval path ignores reviewer-stamp errors/zero rows;
rejection ignores lookup/update/reset response errors and treats NULL/failed
pending counts as zero. They record exact dispatch/stamp ordering, id-only
filters, repeated calls without a local idempotency key and actual validator
stripping of extra fields. Malformed truthy moderation data is a synthetic
response case, not evidence that the real boolean RPC returns that shape.
Authentication middleware is registered but mocked; arbitrary context subjects
are not a hosted authentication-bypass proof. No mocked response proves real
database commit, rollback, permissions or durable audit.

Source/body correction pins the May 1 whole source
`53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7`
and lines 45–56 section
`73ea4b933bcd47aabfd40efb0e383f6eac045d6da654410dc032b348da5fa2e4`.
Its body `dae5cfc5a8d92461a428f6702e4e65af` matches both immutable dated
observations. No SQL is executed by the new correspondence tests.

Migration impact/live database calls/live application calls/deployment: none.
Initial code CI `38684539992` is running; hosting
`7978ca7c-7944-41ad-bb7a-3e45343baf7c` failed separately. Wrapper
`38684540015` skips migration detection/production deployment; a green wrapper
is not an upload. Later documentation heads require their own next-resume check.
Next close actual platform-role/original-actor and competing writer/lock provenance,
then build a separately reviewed disposable atomic kernel only after its authority
and native/consent reconciliation prerequisites are explicit. Do not wire this
codec to an unapplied RPC or present syntax validation as a completed transfer.
Existing recurring continuation remains active without duplication.

## UTF-8 LF pins

| Artifact                                                                                     | Bytes | SHA256                                                             |
| -------------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `src/lib/claim-review-contract.server.ts`                                                    |  5818 | `5d4924fe8edc6ad1f6aff8b0c415df6d9927cdfbcaa662802da8066f8d563a02` |
| `src/lib/claim-review-contract.server.test.ts`                                               | 14012 | `f40481ba5742cf9ff32e49cd2335ac5f6052551869dfe8a9c7b0ea99e80c402f` |
| `src/lib/business-claims.functions.test.ts`                                                  | 23542 | `9148ff56f308ed57c1b26c43941aa236f28feea558aa23236072935b7f9e5675` |
| `scripts/ci/platform-role-source-contract.test.mjs`                                          |  4041 | `d2741aea1206d1d129a75a45243a250633438abd45ea31d664e4a376f13ce986` |
| `src/lib/business-claims.functions.ts` (unchanged)                                           | 21743 | `cc0960e0d7eb1ee065d405f112a9d3a2e7f5d03a57ee80e9908f0901735b52d6` |
| `src/integrations/supabase/auth-middleware.ts` (source inspection, not middleware execution) |  2356 | `3c16c38eda5e4213aaac23a16194722ca413ec454aa8006f4b48a7e586f51868` |
| `src/integrations/supabase/client.server.ts` (source inspection, not live client execution)  |  1727 | `da906172e3cc8b7265d329347e285500718df9011e0dfba2aceadcac0a1f5cd2` |
