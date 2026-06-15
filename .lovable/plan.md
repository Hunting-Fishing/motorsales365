# Phase C-2 Rollout — User-Facing Pages & Admin Wiring

Foundation (DB + server fns + TierBadge) is already in place. This plan wires them into the UI and ships the remaining cron + policy work.

## 1. Disputes (poster-facing)

- `src/routes/_authenticated/disputes.$reportId.tsx` — dispute form for the poster of a reported listing
  - Loads via `getReportForDispute({ reportId })`
  - Textarea (min 30 chars) + up to 5 evidence images uploaded to existing `report-evidence` bucket under `disputes/{reportId}/{uuid}`
  - Countdown showing days remaining in 14-day window
  - Calls `fileDispute`, then redirects to `account.disputes`
  - Shows existing dispute state if already filed (read-only)
- `src/routes/_authenticated/account.disputes.tsx` — user's dispute history list via `listMyDisputes`
- Add "Dispute this decision" link in any place a poster sees a resolved report against them (notification email + account area)
- `src/components/admin/dispute-panel.tsx` — embedded in `ReportCard` when `report_disputes` row exists
  - Shows dispute reason, evidence thumbnails, filed-at
  - Uphold / Overturn buttons → `resolveDispute({ disputeId, decision, response })` (response required, ≥10 chars)
  - Overturn calls `resolve_report_dispute` RPC which already reverses prior action and refunds score

## 2. Trust Score Transparency

- `src/routes/_authenticated/account.trust-score.tsx`
  - Current score + `TierBadge` + progress bar to next tier
  - Paginated event timeline (delta, reason_code, note, created_at) via `getMyTrustScore`
  - Link to `/help/trust-score`
- `src/routes/help.trust-score.tsx` — public SEO page explaining: range 0–1000, baseline 500, what raises/lowers score, dispute mechanism, tier thresholds, rewards overview
- Surface live trust score + `TierBadge` on `PostingUserPanel` (admin dossier) using `getUserTrustScore`

## 3. Rewards Wallet & Tier Display

- `src/routes/_authenticated/account.rewards.tsx`
  - Lists `member_rewards` rows with claim buttons (calls `claimReward`)
  - Shows current `boost_credits` balance
  - Explains tier perks
- `src/routes/admin.rewards.tsx` — admin grant interface using `adminGrantReward`
- Add `TierBadge` next to user display name in:
  - `PostingUserPanel` dossier header
  - `account-team-strip.tsx` per-member row
  - Public listing detail seller card (read tier from `profiles.tier_id`)

## 4. Scheduled Jobs

Three TanStack server routes under `src/routes/api/public/hooks/`, each authenticated via `apikey` header:

- `recompute-tiers.ts` — nightly at 03:00 UTC. Recomputes `profiles.tier_id` for active users (signed in within 90d) by calling `compute_user_tier(user_id)`.
- `quarterly-bonuses.ts` — 1st of Jan/Apr/Jul/Oct at 09:00 UTC. For each active account with **zero accepted reports in the period**, insert a `member_rewards` row sized by tier (Common: 1 boost credit, → Legendary: 10) via `grant_member_reward`.
- `annual-bonuses.ts` — Jan 1 at 10:00 UTC. Larger annual bonus + "Outstanding Member" featured-badge for top 10 Legendary scores (admin reviews/approves spotlight selection in admin rewards page).

pg_cron schedules registered via `supabase--insert` (not migration) since they contain the project URL.

## 5. Policy Sync

- `src/routes/terms.tsx` — add section "Trust Score, Disputes & Member Rewards" covering: score range, how actions affect it, 14-day dispute window, reward/boost credits are non-cashable, tier downgrade rules
- `src/routes/privacy.tsx` — note that moderation actions, dispute submissions, and evidence uploads are retained for the account lifetime + 2 years
- Bump "Last updated" on both

## Answered Defaults (from prior questions)

- Dispute evidence → reuse `report-evidence` bucket under `disputes/` prefix
- Boost wallet → use new `boost_credits` table (already created)
- `profiles.tier_id` → already added; recomputed nightly + on score event trigger
- Ship order → Disputes → Trust score pages → Tier badges + rewards → Cron → Terms/Privacy

## Out of Scope (v1)

- Public leaderboard
- Referral score boosts
- Paid tier upgrades
- Translations (English only)
- Mobile push for dispute notifications (email only via existing transactional templates)

## Technical Notes

- All new `_authenticated` routes safe to use `loader` with the existing server fns (foundation already uses `requireSupabaseAuth`)
- Help/terms/privacy are public — must not call protected fns in loaders
- Tier downgrade: immediate on score drop (handled by `compute_user_tier` trigger), display cache refreshed by nightly cron
- "Outstanding Member" annual: auto-shortlist top 10 by score, admin manual final pick (hybrid of the two options)
