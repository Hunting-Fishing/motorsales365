# Receipt draft-removal safety interlock

## Scope and status

Source `5ede72c6bd8277d39ba170f4af270510f0ba5196`, 16 October 2026, C1.05,
same integrated candidate and draft PR #68. This is a
temporary source interlock, not a completed discard feature or a live restriction.
The action remains in the seven-day scope. No SQL, grants, migration, Storage
policy, live business data or deployment changes are made.

The previous handler permanently removed an attachment through Storage before
calling the separate database discard RPC. A subsequent failure, or confirmation
between these calls, can leave a retained receipt without its original file.
The [official object-deletion documentation](https://supabase.com/docs/guides/storage/management/delete-objects)
states that removed objects are permanently deleted and cannot be recovered.
Ordinary database rollback is not proof of original-byte recovery.

Reordering the calls is not a fix: the retained discard RPC deletes the draft
and cascades its items, while the Storage DELETE policy requires a matching
draft receipt with write access. See
`supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql`, receipt
item foreign key, Storage DELETE policy and `discard_vehicle_receipt_draft`.

## Connected behavior

`discardReceiptDraft` retains its export, ordinary Auth middleware and existing
UUID input validator. Its handler immediately throws the shared unavailable
message, without inspecting handler context or accessing request, business
client, database, Storage or RPC. Auth middleware remains part of the route;
synthetic direct-handler tests do not establish real-session enforcement.

The panel retains an accessible disabled "Discard draft" control with a visible,
linked explanation for writable drafts. It removes the destructive server binding
and click listener, so bypassing the disabled DOM property does not dispatch.
The interlock covers manual and attached drafts without a preflight exception.
Eligible review remains available; all other receipt handlers, editor, installation,
private opener, sharing guard and expense lifetimes remain unchanged.

No operation is admitted, so there is no success acknowledgment, retry promise,
new uncertain-write hold or "removed" feedback. Existing direct authenticated
database RPC and Storage capabilities are unchanged. This app-source safeguard
does not claim to contain every native or concurrent caller.

## Verification

Focused synthetic source tests pass: **1,458/1,458 across 12 suites**, 29.30s.
The 43 new cases comprise 25 actual-handler and 18 panel cases. All prior 161
panel cases remain an exact LF-normalized prefix; independent read-only review
finds no actionable regression and confirms the protected source is unchanged.

Handler cases cover authenticated/service/client/raw contexts, unsupported and
opaque getter/Proxy contexts without access, manual/attached hints and retained
UUID validation. Panel cases cover manual/attached, complete/incomplete and
editor-incompatible drafts, filtered-out lines, zero-item review, read-only access,
raw disabled-button bypass, account/vehicle/Auth-loading transitions and read
failure/retry without mutation or false removal feedback.

Final full TypeScript passes. Changed-line lint against `15743f05` has zero new
errors or warnings across five files, with seven retained findings elsewhere.
Prettier/diff checks pass. Existing unconditional actual-handler/panel CI coverage
already includes these cases; no workflow change is needed. Offline wiring guards
pass 2/2 (145.67ms), with normal timeouts/quarantine unchanged and no repeated
Windows full-suite run.

Fresh complete build passes with retained route-test/module/chunk/Wrangler
warnings. At source `5ede72c6`, all 214 tracked public Git/source/output copies,
Worker `motorsales365`/`index.mjs`, canonical backend, 15 OCR and 202 PDF assets and
browser-engine/server separation verify. No upload or deployment occurred.

Parent `15743f05` now has all six Actions gates passing in run `38867685088`.
Completed unit job `116864182583` reports application 3,880/3,880 across 86 files,
90.09s, zero unexpected/quarantined failures; overall log truncated, final summary
and checker present. Parent selected native SQL/47 retained replay failures,
preview configuration skip and independent Workers failure remain documented in
`RECEIPT_EXPENSE_CALLER_SAFETY.md`. They are not new-head acceptance. This interlock
will publish with the next connected installation slice on the same PR, not a
duplicate or planning-only PR. New-head CI must be checked after that publication.

These are not API/Auth/private-object/transaction/restore or owner/live acceptance.

## Remaining release gate and next action

Safe removal needs a durable immutable operation identity bound to original
account, tenant, receipt, object key and status; native reservation and compatible
pending-deletion fences in every competing writer; crash-resumable idempotent
states, leases and reconciliation; approved actual original-byte recovery; and
verified terminal row/object state before a bound acknowledgment.

Rehearse failures between every stage, lost acknowledgments, duplicate attempts,
confirmation/save/retarget/upload races, authority changes and recovery in approved
isolation. Do not add broad grants or assume a database backup restores Storage
bytes. Do not delete live originals to test this. Caller/UI acknowledgment work
alone cannot satisfy this gate.

Continue independent sharing/installation/complete-line viewing while recovery
prerequisites remain unresolved. Preserve approved legacy restrictions, no Docker,
the sole canonical hosted backend, and the owner-completed QA credential/Terms
handoff. The latest read-only browser check still shows that signup unsubmitted;
dedicated session and trusted synthetic native-shop roles remain unverified.
