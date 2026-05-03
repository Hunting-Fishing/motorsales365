## Goal

Providers can already place a bid and there's an "Update bid" / "Withdraw" affordance, but the flow has rough edges. Make edit and withdraw work cleanly and only while the bid is still `pending`.

## Behavior

**Edit (only while pending)**
- "Update bid" button is shown only when the provider's bid status is `pending`. If the bid is `accepted`/`declined`/`withdrawn`, show a status badge instead with no edit button.
- Dialog title reads "Update your bid" when editing; submit button reads "Save changes".
- Submitting performs an `UPDATE` on the existing row (price, eta, note, `status='pending'`, `updated_at=now()`), not an upsert that could clobber a non-pending row.
- New bids continue to use insert with `status='pending'`.

**Withdraw (only while pending)**
- Confirmation via `AlertDialog` ("Withdraw your bid? The customer will no longer see it.").
- Performs `UPDATE tow_bids SET status='withdrawn'` instead of DELETE — preserves history and matches the existing status enum used by the trigger/RLS.
- After withdrawing, the provider can place a fresh bid again (the upsert path treats a non-pending row as replaceable, setting status back to `pending`).
- Requester's bid list filters out `withdrawn` and `declined` bids so the UI stays clean.

**Guardrails**
- Re-check `my.status === 'pending'` inside `submitBid`/`withdrawBid` before firing the request, so a stale UI can't bypass the rule (RLS already prevents cross-provider edits).
- If the parent `tow_requests.status` is no longer `open` (already accepted/cancelled/completed), disable both buttons and surface a small "Request closed" hint.

## Files touched

- `src/routes/dashboard.tow.tsx`
  - Replace the upsert in `submitBid` with insert-or-update branching based on whether `myBidFor(r.id)` exists and is pending.
  - Change `withdrawBid` to update status to `withdrawn` and wrap the trigger button in an `AlertDialog`.
  - Tighten the broadcast tab action row: hide Update/Withdraw unless bid is pending and request is still open; show status badge otherwise.
  - Filter `bidsForRequest` used in the requester "Sent by me" tab to exclude `withdrawn`/`declined`.

No database migration is needed — `tow_bids.status` already supports `withdrawn`, RLS already lets providers manage their own rows, and the accept trigger only fires on transition to `accepted`.
