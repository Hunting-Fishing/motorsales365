# Phase C-2 — Disputes, Trust-Score UX, Rewards, Cron, Policy sync

Builds on the Phase C foundation (ledger tables, `apply_report_action`, revamped card UI) that's already live. Five tracks, each independently shippable.

## 1. Poster-facing disputes

- `src/lib/disputes.functions.ts`
  - `fileDispute({ reportId, message, evidenceUrls[] })` — RLS-enforced; one open dispute per report per user; 14-day window.
  - `getMyDispute({ reportId })` — for the poster.
  - `listOpenDisputes()` — admin/moderator list for the queue.
  - `resolveDispute({ disputeId, decision: 'uphold'|'overturn', response })` — admin only; on overturn calls `apply_report_action(action='reverse', reverses_action_id=<original accept row>)`, sets `score_refund`, restores listing if it was hidden.
- `src/routes/_authenticated/disputes.$reportId.tsx` — poster view. Shows report reason, public summary, current decision, trust-score change, dispute form (textarea + up to 5 image uploads to `report-evidence` bucket), countdown to deadline, status once filed.
- `src/routes/_authenticated/account.disputes.tsx` — list of all the user's disputes (open / upheld / overturned).
- Admin side:
  - `src/components/admin/dispute-panel.tsx` mounted inside `ReportCard` when a dispute exists, showing message + evidence + Uphold/Overturn buttons (each opens a confirmation with required response note).
  - New filter chip "Disputed" on `/admin/reports`.
- Email: extend resolution path so when `notify_poster=true` on accept, an email with a "Dispute this decision" deep link is sent (reuse `src/lib/email/send.ts`; new template `dispute-invite.tsx`). On dispute resolution, send `dispute-upheld.tsx` / `dispute-overturned.tsx`.

## 2. Trust-score transparency

- `src/lib/trust-score.functions.ts`
  - `getTrustScoreBreakdown({ userId? })` — returns current score, baseline, sum of deltas, list of events (paginated), grouped totals by reason_code.
  - Admin-only `adjustTrustScore({ userId, delta, reason })` — writes a `manual_admin_adjustment` event; required note.
- `src/routes/_authenticated/account.trust-score.tsx` — user-facing breakdown: big score number, tier badge, progress bar to next tier, timeline of events with reason codes, link to the explainer.
- `src/routes/help.trust-score.tsx` — public SEO page: how the score works, all reason codes with point values, how to dispute, link to posting etiquette.
- Surface score chip on `PostingUserPanel` (already shows trust_score — switch to live `get_trust_score()` value) and link to user's trust-score page.

## 3. Member tiers + rewards

- `src/lib/tiers.functions.ts`
  - `getMyTier()` / `getUserTier({ userId })` — returns tier id, score, tenure days, distance to next tier.
- `src/lib/rewards.functions.ts`
  - `listMyRewards()` / `claimReward({ id })` (sets `status='claimed'`, claimed_at; if `kind='boost_credit'` writes a row into a new wallet table — see below).
  - Admin: `listAllRewards()`, `grantReward({ userId, kind, amount, note })`, `revokeReward({ id, reason })`.
- New table `boost_credits` (wallet) — simple ledger of granted/consumed credits with a `source` ('reward'|'purchase'|'manual'); existing boost flow checks this wallet first before charging. Migration in same call.
- `src/components/tier-badge.tsx` — small chip used on profile, shop page, listing cards. Color mapped from `member_tiers.color`.
- `src/routes/_authenticated/account.rewards.tsx` — current tier, progress, claimable + history.
- `src/routes/admin.rewards.tsx` — distribution queue, manual grants, audit log.

## 4. Scheduled distributions (pg_cron + server routes)

- `src/routes/api/public/hooks/recompute-tiers.ts` (nightly) — for each user, derives tier from `get_trust_score()` + `created_at`, stores on `profiles.tier_id` (new column). Used only for display caching — authoritative tier is always recomputed.
- `src/routes/api/public/hooks/quarterly-bonuses.ts` (1st of Jan/Apr/Jul/Oct) — for active accounts (≥1 listing this quarter, no accepted reports), inserts `member_rewards` rows of `kind='boost_credit'` with `amount=tier.quarterly_boost_credits`, `period='qN-YYYY'`. Idempotent by `(user_id, period, kind)`.
- `src/routes/api/public/hooks/annual-bonuses.ts` (Jan 1) — issues annual boost credits + featured badge by highest tier reached. Surfaces top-10 Legendary list for admin manual spotlight pick.
- pg_cron entries via `supabase--insert` after routes ship, using `apikey` header.

## 5. Policy sync (Core memory rule)

- `src/routes/terms.tsx` — append "Trust score & rewards" section explaining score formula, dispute window, tier benefits (free boosts, badges). Bump "Last updated".
- `src/routes/privacy.tsx` — note that moderation actions and dispute history are logged per-user. Bump "Last updated".
- Link to `/help/trust-score` from `/help/posting-etiquette` and from the report-resolution email.

## Open questions

1. **Dispute evidence storage** — reuse existing `report-evidence` bucket (admin reads via signed URL), or stand up a separate `dispute-evidence` bucket? Reusing is simpler.
2. **Boost credit wallet** — confirm OK to add a new `boost_credits` ledger table (cleaner audit) rather than overload `listing_boosts` with a `source` column.
3. **Tier `tier_id` cache on profiles** — OK to add a `profiles.tier_id text` column for fast badge display, recomputed nightly? Authoritative tier still derived from score on read.
4. **Order to ship** — recommend: (1) Disputes UX, (2) Trust-score pages, (3) Tier badges + rewards UI, (4) Cron jobs, (5) Terms/Privacy. Want a different order, or ship all five in one big batch?

## Out of scope

- Public leaderboard.
- Referral score boosts.
- Paid tier upgrades (real money buys a tier).
- Translating help pages (English-only v1).
