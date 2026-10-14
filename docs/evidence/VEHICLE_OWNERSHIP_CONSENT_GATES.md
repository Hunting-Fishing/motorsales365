# Vehicle ownership, consent and private receipt gates

2026-10-15 Asia/Manila. Retained-source review and isolated regression only;
**not a live incident, implemented transfer workflow or applied mitigation**.

`scripts/ci/vehicle-receipt-ownership-boundary.test.mjs` pins two whole retained
sources and 14 exact selected sections: the receipt/link/item DDL, receipt/link/
storage read policies and ownership/shop/receipt helpers, and all three original
vehicle owner/public/admin policies. Three always-closed memory-only fixtures use
synthetic actors, receipts and storage object-metadata rows. Supporting admin/
module helpers are explicitly stubs, not native authority proofs. No file bytes,
signed URLs, downloads, HTTP/JWT, Storage service or live records are tested.

Four focused regressions demonstrate:

- Public vehicle visibility alone does not expose unshared receipts.
- An ordinary owner cannot transfer the row using the retained owner WITH CHECK
  policy. A privileged **synthetic** owner change makes the new current owner able
  to read an old creator's unshared receipt and its synthetic object metadata;
  the old creator loses that ownership-based path. The receipt creator/sharing
  values do not change. This follows the existing `receipt_access` helper.
- Existing shared owner-origin receipts remain shop-readable through a stale
  active link after that synthetic change until revocation. Direct native-shop
  receipt access is a separate existing branch, independent of owner sharing.

Test LF-normalized SHA-256:
`2172a3698a710b141cf1465ecd5f66c9d8d934041b582ab7e0c5c0698d693d0e`.
Focused 4/4 and complete local tooling 134/134 pass; lint/format/diff pass.

The separate Customer 360 candidate adds current-owner/approver equality and a
current-creator filter for owner-origin receipts, but does not repair existing
receipt readers. Its tests also show that retaining an approval across A-to-B-to-A
can restore access. Equality is not proof of a fresh ownership tenure.

## Bounded implementation review

`src/lib/vehicles.functions.ts` creates vehicles for the authenticated caller;
its update schema does not accept owner_user_id but allows ownership_count edits.
That count is not a trusted consent epoch. The retained listing-transfer FK and
`.lovable/sync-groups.md` transfer-on-sale description do not implement a transfer.
No implemented owner-transfer endpoint or owner-change link invalidation was found
in the bounded route/API/lib and retained-migration search. This is **not** proof
that no live trigger, external writer, admin operation or dynamic path exists.

The retained receipt `approve_link` checks ownership and locks the link-request row,
not the public vehicle row. It resolves native shop/customer, optionally checks
VIN, activates a link and backfills receipt/installation references/history.
`revoke_link` checks current ownership and marks the link inactive/revoked.
Neither alone establishes serialized owner-change/approval ordering. Workspace
write/expense flags and privileged/public passport projections are not a minimal
private-vehicle consent read contract.

## Required invariant before transfer/private-vehicle release

1. Recover current owner-writer, trigger, helper, caller and grant closure with
   source/catalog correspondence; identify every permitted owner-change path.
2. Atomically invalidate every existing link on each actual owner change. Serialize
   owner changes, approval and revocation on the same public-vehicle row; bind the
   actor and current ownership inside that transaction. Require fresh approval.
   Test real concurrent transactions, A-to-B-to-A and failure recovery.
3. Decide reviewed reapproval/quarantine handling for existing approvals. Do not
   invent/backfill an epoch from editable ownership_count, infer consent from a
   matching VIN, or silently repair bindings/data/history.
4. Only after that invariant is proven, expose the minimum reviewed invoker consent
   projection needed for private linked vehicles; do not open the full vehicle row
   or introduce an unrestricted definer shortcut.
5. Explicitly distinguish portable public service history from private financial
   receipts/files and decide retention/transfer semantics before release. Do not
   automatically transfer, reset or delete financial evidence.

No new production decision or write is authorized by this document. Continue
independent read-only UI and migration provenance work while these gates remain.
