## Goal

Turn broadcast tow requests into a **bid board**: providers see open jobs, submit a quote (price + ETA + note), and the requester picks a winner. Also let providers configure default/standard rates that pre-fill bids.

## Database changes

**New table `tow_bids`**
- `id`, `request_id` (→ `tow_requests.id`, cascade), `provider_id` (uid), `price_php` (numeric), `eta_minutes` (int, nullable), `note` (text, nullable), `status` (`pending` | `accepted` | `declined` | `withdrawn`), timestamps.
- Unique `(request_id, provider_id)` so one active bid per provider; updates replace it.

**RLS on `tow_bids`**
- Provider can `INSERT`/`UPDATE`/`SELECT` their own rows when `is_towing_provider(auth.uid())`.
- Requester of the parent `tow_requests` row can `SELECT` all bids on it and `UPDATE` to accept (`status='accepted'`).
- Admins manage all.

**Trigger when a bid is accepted**
- Sets the parent request: `status='accepted'`, `provider_id = bid.provider_id`.
- Marks all sibling bids `declined`.
- Sends inbox `messages` to: winning provider ("Your bid was accepted…") and declined providers ("Customer chose another provider"). Requester already sees status update in their dashboard.

**New table `provider_tow_rates` (provider's standard rates)**
- `user_id` (PK), `flat_base_php`, `per_km_php`, `min_php`, `currency` ('PHP'), `available_24_7` (bool), `notes`, timestamps.
- RLS: owner manages own row; public read (so requesters can see indicative rates next to bids if we want later).

**Realtime**
- Add `tow_bids` to `supabase_realtime` publication so the requester's bid list updates live.

## UI changes

**`/dashboard/tow` (provider view)**
- Open jobs tab: each card adds a **"Place bid" / "Update bid"** button.
- Bid dialog: price (PHP), ETA (minutes, optional), short note. Pre-filled from `provider_tow_rates` if set.
- Show provider's own bid status badge on the card (Pending / Accepted / Declined).
- Decline button stays as "Hide" on broadcast jobs.
- New section **"My standard rates"** with form for `provider_tow_rates`.

**`/dashboard/tow` (requester view — Sent by me tab)**
- Each open request expands to show a **bid list** with provider name, price, ETA, note, and an **Accept** button.
- Accepting a bid calls a single `UPDATE tow_bids SET status='accepted'` — the trigger does the rest.
- After accept, request shows the winning provider's contact (already linked via existing messages thread).

**`/tow` (request submission)**
- Add a small line under the form: "Open requests are visible to verified tow providers, who can bid on the job. You'll see all bids on your dashboard."

## Notes

- No new payment processing here — rates are informational. The bid is a quote; payment happens off-platform until a payment integration is added.
- The existing `notify_towing_providers` trigger keeps fanning out new broadcast requests as inbox messages so providers notice them.
- Direct (provider-specific) requests skip the bid flow — they keep the current Accept/Decline behavior.

## Files touched

- `supabase` migration: tables, RLS, accept-bid trigger, realtime.
- `src/routes/dashboard.tow.tsx`: bid dialog, bid list for requester, standard-rates form section.
- `src/routes/tow.tsx`: small explainer line.
