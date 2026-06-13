
## Goal

Let users post structured "Parts wanted" and "Parting-out vehicle wanted" requests tied to a specific vehicle (make/model/year/engine code). When a matching listing is published, auto-notify the requester. Also surface these wants on their profile.

Example: user wants "engine for 1991 Pajero" → system resolves to make=Mitsubishi, model=Pajero, year=1991, engine=4D56T (from `vehicle-engines.ts`). When a listing in `parts` category with fitment Mitsubishi/Pajero covering 1991 (and matching `4D56T` in attributes/title/description) gets published, the user gets notified.

## What we build

### 1. DB migration

**`parts_wanted`** — replaces ad-hoc `wanted_posts` for parts/parting-out (keeps `wanted_posts` for other categories).
- `user_id`, `kind` enum (`part` | `parting_out`), `title`, `notes`
- Vehicle fitment: `make`, `model`, `year`, `engine_code` (nullable), `trim` (nullable), `vehicle_category`
- Part: `part_category` (brakes/engine/body/...), `part_keywords text[]`, `condition_pref` (any/used/new/oem/aftermarket)
- Budget: `budget_max_php`, `region`, `city`
- Alerts: `alert_frequency` ('off'|'instant'|'daily'), `last_alerted_at`, `status` ('open'|'closed'|'expired'), `expires_at` (90d default)
- RLS: owner manages; open rows publicly viewable (anonymized — like wanted_posts).
- GRANTs to authenticated + service_role + anon SELECT (open only).

**`parts_wanted_matches`** — one row per (wanted, listing) match.
- `wanted_id`, `listing_id`, `score numeric`, `matched_at`, `notified_at`, `dismissed_at`
- Unique on (wanted_id, listing_id). Owner-only read via wanted ownership.

**Match function** `match_listing_to_parts_wanted(listing_id)` (SECURITY DEFINER, plpgsql):
- Triggered on listing status → 'published' in category `part`.
- Joins listing + listing_fitment + attributes JSON.
- For each open `parts_wanted` row:
  - +3 if fitment make/model matches
  - +2 if year falls in fitment year_min..year_max
  - +2 if `engine_code` appears in listing title/desc/attributes.engine_code
  - +1 per part_keyword found in title/desc
  - Region match +1
  - Threshold ≥4 → insert into `parts_wanted_matches`.

**Trigger**: `AFTER UPDATE OF status ON listings` when NEW.status='published' AND category_slug='parts' → call match function.

**Backfill**: on insert into `parts_wanted`, also scan last 60 days of published parts listings.

### 2. Server functions (`src/lib/parts-wanted.functions.ts`)

- `createPartsWanted` — auth, validates with zod, resolves engine code via lookup helper, inserts row, kicks off backfill scan.
- `updatePartsWanted`, `closePartsWanted`, `deletePartsWanted`
- `listMyPartsWanted` — owner list with match counts
- `listMyMatches({ wantedId? })` — joins listing summary
- `dismissMatch({ matchId })`
- `listPublicPartsWanted` — for community board (anonymized)

### 3. Vehicle resolver helper (`src/lib/vehicle-resolver.ts`)

Pure TS helper that takes free-text (e.g. "91 pajero engine") and returns best (make, model, year, engine_code) using `vehicles.ts` + `vehicle-engines.ts` fuzzy match (`src/lib/fuzzy.ts` already exists). Used by the form's "smart parse" button and by background re-resolution.

### 4. UI

**New routes**
- `src/routes/wanted-parts.index.tsx` — public board: filters (make/model/year/part category/region). Replaces `parts` tab inside `wanted.index.tsx` (cross-link).
- `src/routes/wanted-parts.new.tsx` — structured form (vehicle picker via existing `vehicle-picker.tsx` + engine select pulled from `VEHICLE_ENGINES`, part category, keywords, condition, budget, region, alert freq).
- `src/routes/_authenticated/dashboard.parts-wanted.tsx` — owner dashboard: list of wants + match inbox with listing thumbnails, "View listing" / "Dismiss" / "Close request".

**Components**
- `src/components/parts-wanted/vehicle-engine-picker.tsx` — make/model/year/engine cascading select, prefills from free text.
- `src/components/parts-wanted/match-card.tsx` — listing preview + score badge.
- `src/components/parts-wanted/wanted-badge.tsx` — small badge on listing detail "X buyers wanted this part" (read from RPC).

**Profile integration**
- Add "Parts I'm looking for" section to `src/routes/profile.$id.tsx` (owner sees full list; public sees public-safe summary).
- Add "Parting out wanted" section similarly.
- Surface a count chip on the user's passport/profile header.

**Header/nav**
- Add `/wanted-parts` link under existing Wanted nav entry.
- Dashboard sidebar gets "Parts Wanted (n new matches)" pill using `useAdminPendingCounts`-style polling.

### 5. Notifications

- **Instant**: server fn `notifyPartsWantedMatches` enqueues email via existing `enqueue_email` RPC using new template `parts-wanted-match.tsx` (subject: "We found a match: {part} for {year} {make} {model}"). Also creates an in-app row via existing notification path used by reports/inquiries.
- **Daily digest**: pg_cron job (added to existing cron infra via `supabase--insert`) calls `/api/public/hooks/parts-wanted-digest` at 08:00 PHT → batches unsent matches grouped by user → one email + marks `notified_at`.
- Frequency respects `alert_frequency` on the row; "instant" gated to authenticated users (no extra plan requirement — this is core ops, unlike saved_search instant which is Premium).

### 6. Admin

- `src/routes/admin.parts-wanted.tsx` — moderation list, ability to close abusive requests, view match stats. Feed admin pending counts RPC with new bucket `parts_wanted_flagged`.

### 7. Policy + Terms

- Update `/terms` and `/privacy`: structured vehicle/part wants are stored and used to send match alerts; users can disable per-request; emails respect suppression list. Bump "Last updated".

## Technical details

- All match writes go through `supabaseAdmin` inside server fns / triggers — no client write to `parts_wanted_matches`.
- Year-match handles open-ended fitment (`year_min` only, `year_max` only).
- Engine code matching is case-insensitive and tolerant (`4D56T` ≈ `4d56-t`).
- Re-resolve engine code on `parts_wanted` update via DB trigger calling an immutable helper that reads engine catalog from a small lookup table seeded from `vehicle-engines.ts` (one-time seed migration) so SQL can match without app round-trip.
- Email send goes through existing pgmq `transactional_emails` queue.
- No edge functions; cron hits TanStack `/api/public/hooks/parts-wanted-digest` with `apikey` header.

## Files

**Migrations** (1 file):
- `parts_wanted`, `parts_wanted_matches`, `vehicle_engine_lookup` (seeded), match function, listing trigger, RLS, GRANTs.

**New code:**
- `src/lib/parts-wanted.functions.ts`
- `src/lib/vehicle-resolver.ts`
- `src/lib/email-templates/parts-wanted-match.tsx`
- `src/routes/wanted-parts.index.tsx`
- `src/routes/wanted-parts.new.tsx`
- `src/routes/_authenticated/dashboard.parts-wanted.tsx`
- `src/routes/admin.parts-wanted.tsx`
- `src/routes/api/public/hooks/parts-wanted-digest.ts`
- `src/components/parts-wanted/{vehicle-engine-picker,match-card,wanted-badge}.tsx`
- `src/hooks/use-parts-wanted-matches.ts`

**Edited:**
- `src/routes/profile.$id.tsx` — add wants sections.
- `src/routes/wanted.index.tsx` — cross-link to parts board.
- `src/routes/listing.$id.tsx` — show "X buyers want this" badge.
- `src/routes/admin.tsx` — nav pill.
- `src/routes/terms.tsx`, `src/routes/privacy.tsx` — disclosure update.
- `src/components/site-header.tsx` — Wanted submenu adds Parts link.

## Out of scope (ask before adding)

- SMS / push notifications (email + in-app only)
- Seller-side "Reach buyers waiting for this part" paid boost
- Automated DMs to sellers on behalf of wanters
