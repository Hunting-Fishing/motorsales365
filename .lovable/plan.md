# Phase C — Fair Moderation + Member Rewards

Goal: make every moderation action explicit, reversible, and explainable; let posters dispute decisions; turn the trust score into a transparent, two-way system; and reward consistently good members with quarterly free boosts and annual tier bonuses (common → legendary).

---

## 1. Safer report actions (UI/UX)

In `src/components/admin/report-card.tsx` rebuild the action row:

- **Color-coded buttons** (semantic tokens, not raw colors):
  - Accept (confirms violation) — `destructive` outline, red accent
  - Dismiss (no violation) — `secondary`, muted
  - Hide listing — `warning` (amber) outline
  - Delete listing — solid `destructive`, requires typed confirmation
  - Publish summary — `default` primary
  - Reverse decision — `outline` with undo icon (only when resolved)
- **No auto-action on Accept.** Today, "Accept" silently chains effects; change to: Accept only marks the report as a confirmed violation. Hiding/deleting the listing become explicit follow-up steps inside the confirmation dialog (checkboxes: "Also hide listing", "Also notify poster", "Issue strike").
- **Info icons (ⓘ)** beside every button → Popover explaining:
  - what the action does
  - effect on listing
  - effect on poster's trust score (+/− points)
  - whether the poster can dispute it
  - whether/how it can be reversed
- **Confirmation dialog** for every state-changing action (`ConfirmActionDialog` new component): shows action summary, score delta preview, required moderator note (min 10 chars), and an optional "send message to poster" textarea. Delete-listing requires typing the listing title.
- **Status chips** at the top of the card use color: open=amber, accepted=red, dismissed=slate, reversed=blue, disputed=purple.

## 2. Report action history + reversal

New table `report_actions` (append-only ledger):

```text
id, report_id, actor_id, action, prev_status, new_status,
score_delta, note, listing_effect (none|hidden|deleted|restored),
notified_poster bool, created_at, reversed_by_action_id
```

- Every Accept / Dismiss / Hide / Delete / Publish / Unpublish / Reverse / Dispute-resolve writes one row.
- **Reverse decision** action: only admins; opens dialog explaining what will be undone (status flips back to open, score delta inverted, hidden listing un-hidden, deleted listing cannot be auto-restored — flagged for manual restore). Writes a new row with `reversed_by_action_id` pointing at the original.
- New "History" tab in `ReportCard` showing a timeline (icon, actor, action, note, score delta) using existing audit styling.

## 3. User disputes

New table `report_disputes`:

```text
id, report_id, user_id (poster), message, evidence_urls[],
status (open|upheld|overturned), admin_response, resolved_by,
resolved_at, score_refund, created_at
```

- New public route `src/routes/_authenticated/disputes.$reportId.tsx`: poster sees the report reason, public summary, current decision, and a form to file a dispute (one per report). They can attach up to 5 evidence images.
- Notify poster: when a report resolves against them, send an in-app notification + email with a "Dispute this decision" link (14-day window).
- Admin side: new tab in `/admin/reports` filter ("Disputed"), and a Dispute panel inside `ReportCard` showing the poster's message + evidence. Admin actions:
  - **Uphold** — dispute denied, no score change.
  - **Overturn** — auto-reverses the original decision, refunds the score delta plus a +5 "wrongly reported" bonus, un-hides listing if applicable.
- All dispute actions write to `report_actions`.

## 4. Transparent, fair trust score (v2)

Replace the ad-hoc formula in `admin-user-dossier.functions.ts` with a documented, two-way ledger.

New table `trust_score_events`:

```text
id, user_id, delta, reason_code, reason_label, source_type
(report|dispute|review|verification|listing|bonus|tier|manual),
source_id, actor_id, created_at
```

Score is now `500 + sum(delta)` clamped to `0..1000`, **not** recalculated from scratch — every change is auditable.

Reason codes (negative):
- `report_accepted` −25
- `listing_hidden` −10
- `listing_deleted` −40
- `repeat_offense_30d` −15 (stacking)
- `low_rating` −5 per ≤2★ review

Reason codes (positive):
- `dispute_overturned` +original_delta +5
- `verified_identity` +50
- `verified_business` +75
- `5★_review` +3
- `completed_sale` +2
- `quarterly_clean_streak` +25 (no accepted reports in 90 days)
- `tier_bonus` variable (see §5)
- `manual_admin_adjustment` (admin-only, requires note)

User-facing `/account/trust-score` page (and a public `/help/trust-score`) explains every reason code, current score, history timeline, and current tier. Score breakdown also appears in the admin dossier and in dispute forms so users see exactly which event lost them points.

## 5. Member reward tiers (common → legendary)

New tables `member_tiers` (config) and `member_rewards` (issued).

Tiers (based on trust score + tenure, recomputed nightly):

| Tier       | Min score | Min tenure | Color    |
|------------|-----------|------------|----------|
| Common     | 0         | 0          | slate    |
| Uncommon   | 550       | 30 d       | green    |
| Rare       | 650       | 90 d       | blue     |
| Epic       | 750       | 180 d      | purple   |
| Legendary  | 875       | 365 d      | amber/gold |

**Quarterly bonuses (every 3 months, pg_cron):**
- Active accounts (≥1 listing or ≥1 sale in quarter) with no accepted reports get free boost credits scaled by tier: Common 1 · Uncommon 2 · Rare 4 · Epic 7 · Legendary 12.
- Credits drop into existing `listing_boosts` flow as `source = 'tier_bonus'`.
- In-app notification + email.

**Annual bonuses (Jan 1, pg_cron):**
- Highest-tier reached during the year unlocks:
  - Legendary → free 12-month "featured seller" badge + 30 boost credits + custom shop banner slot
  - Epic → 6-month badge + 15 boost credits
  - Rare → 3-month badge + 8 boost credits
  - Uncommon → 4 boost credits
- "Outstanding member of the year" — top 10 by score within Legendary tier get a manual review queue surfaced to admins for a hand-picked spotlight feature.

UI:
- Tier badge on profile, shop page, listing cards (small chip).
- New `/account/rewards` page: current tier, progress bar to next tier, claimable rewards, history.
- Admin `/admin/rewards` page: see upcoming distributions, manually grant/revoke, audit log.

## 6. Cross-cutting

- Sync rule: §1–§5 touch fees/boosts/score → update `/terms` "Last updated" and add a "Trust score & rewards" section; update `/privacy` for new score-event logging; add `/help/trust-score` and `/help/rewards`. Per `mem://policies/terms-sync` and `mem://policies/privacy-sync`.
- Link from posting-etiquette page to `/help/trust-score`.
- All admin actions still gated by `has_role(...,'admin'|'moderator')`. Reversal limited to `admin`. Manual score adjustments limited to `admin` and always logged.

---

## Technical sketch (for the implementer)

- **Migrations**: `report_actions`, `report_disputes`, `trust_score_events`, `member_tiers` (seed 5 rows), `member_rewards`. All with GRANTs (`authenticated` for own rows via RLS, `service_role` full). Trigger on `reports` resolution → writes default `trust_score_events` + `report_actions` rows via SECURITY DEFINER function `public.apply_report_resolution(report_id, action, actor, note, opts)`.
- **Server fns** (`src/lib/`): `report-actions.functions.ts` (apply/reverse), `disputes.functions.ts` (file/list/resolve), `trust-score.functions.ts` (read events, breakdown), `rewards.functions.ts` (list, claim, admin grant), `tiers.functions.ts` (current tier, progress).
- **Cron**: `src/routes/api/public/hooks/quarterly-bonuses.ts` + `annual-bonuses.ts` + nightly `recompute-tiers.ts`, all wired through pg_cron with `apikey` header.
- **Components**: `ConfirmActionDialog`, `ActionInfoPopover`, `ReportHistoryTimeline`, `DisputePanel`, `TrustScoreBreakdown`, `TierBadge`, `RewardsCard`.
- **Hook**: `useTrustScore(userId)` and `useMemberTier(userId)` with React Query.

## Open questions

1. **Score range** — OK with `0..1000` starting at 500, or prefer keeping current `0..100`? (1000 gives finer granularity for tier thresholds.)
2. **Dispute window** — 14 days from resolution OK, or shorter/longer?
3. **Tier downgrade** — should a user drop tiers immediately when score falls, or only at quarterly recompute? (Recommend quarterly to avoid yo-yo.)
4. **Annual "Outstanding Member"** spotlight — fully manual admin pick from the Legendary shortlist, or auto-top-3 by score?
5. **Boost credit accounting** — reuse existing `listing_boosts` table with a `source` column, or new `boost_credits` wallet table?

Out of scope here: paid tier purchases, referral-based score boosts, public leaderboard.
