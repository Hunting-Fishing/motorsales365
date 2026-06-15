# Posting-User Context Panel on Reports

Right now the report card focuses on the **reporter**. We'll add a second, richer panel for the **posting user** (the seller of the reported listing, or the owner of any other reported target) plus a dialog to drill in.

## Scope (Phase A — admin-facing only, no schema changes)

A new collapsible **"Posting user"** block under the report header, with three layers:

### 1. Identity strip (always visible)
- Avatar, display name (full_name → business_name → email), **User #1,234** badge, seller type, account_status.
- Verified badge, founding-member badge.
- Joined date + city/region.
- Quick actions: **View profile**, **Open full dossier** (dialog), **Email**, **Message** (links to existing admin messaging if present).

### 2. At-a-glance stats grid (always visible, 4–6 tiles)
Pulled in a single batched server fn `getUserAdminDossier({ userId })`:
- **Reports against** — total / open / resolved-accepted (taken down) / dismissed.
- **Listings** — active / hidden / removed.
- **Trust score** — 0–100 composite (see formula below) with color band.
- **Revenue** — sum of `payments.amount` where status='succeeded', last 90d + lifetime.
- **Engagement** — affiliate clicks (`vehicle_part_clicks` + `shop_clicks` + `training_partner_clicks`), QR scans, listing_views.
- **Communications** — count of admin-originated messages + support tickets.

### 3. "Full dossier" dialog (on demand)
Tabbed view; each tab lazy-loads:
- **Overview** — identity, score breakdown, recent admin notes.
- **Reports** — list of every `reports` row where seller is the listing owner (uses `listings.user_id`) or report target = this user. Filter by status.
- **Listings** — table with status, price, created_at, # reports, # boosts.
- **Communications** — merged timeline of: `messages` (admin↔user), `support_tickets`, `admin_audit_log` entries scoped to this user, `account_audit_log`, `ad_inquiry_messages` where admin participated.
- **Billing** — `payments`, `payment_line_items`, `subscriptions`, `bundle_purchases`, `passport_premium_purchases`, `listing_boosts` — unified ledger.
- **Engagement** — affiliate clicks, QR scans, favorites received, seller_reviews (avg + count).
- **Admin notes** — free-text notes the team can append (uses a new lightweight `admin_user_notes` table — see Phase B).

## Trust score (composite, 0–100)

```text
score = 100
  − min(30, reports_accepted × 8)        // taken-down listings hurt
  − min(15, reports_open × 3)
  − min(10, dismissed_reporter × 2)      // if THEY filed dismissed reports
  + min(15, verified ? 15 : 0)
  + min(10, seller_rating_avg × 2)       // 0–10
  + min(10, log10(lifetime_revenue+1)*2) // diminishing
  + min(5,  founding_member ? 5 : 0)
clamped 0..100
```
Bands: 0–39 red, 40–69 amber, 70–100 emerald.

## Phase B (separate migration, only if you greenlight)
- `admin_user_notes` (user_id, author_id, body, pinned, created_at) for the dossier's Admin notes tab.
- Optional `admin_user_dossier_v` materialized view to cache the score nightly (skip for now — live query is fine at admin volumes).

## Technical changes

```text
src/lib/admin-user-dossier.functions.ts   (new)
  getUserAdminDossier({ userId })  → { identity, stats, score }
  listUserReports / listUserCommunications / listUserBilling / listUserEngagement
                                   (paged tab loaders)

src/components/admin/posting-user-panel.tsx        (new — strip + stats)
src/components/admin/user-dossier-dialog.tsx       (new — tabbed drill-in)
src/components/admin/report-card.tsx               (insert panel above Reporter/Evidence row)
src/routes/admin.reports.tsx                       (no change beyond passing listing.user_id)
```

All queries gated behind `has_role(auth.uid(),'admin'|'moderator')` inside the server fn.

## Out of scope for this round
- Editing user records from the dossier (already lives in `/admin/users`).
- Refunding payments (Stripe dashboard).
- Pushing new admin→user messages from the dialog (Phase C, after you confirm channel).

## Open questions
1. **Communications source of truth** — is admin↔user chat in `messages` only, or also `support_tickets` + `ad_inquiry_messages`? I'll merge all three by default unless you say otherwise.
2. **Admin notes** — okay to add the `admin_user_notes` table in Phase B, or skip notes for now?
3. **Trust score formula** — happy with the weights above, or want me to tune (e.g. weigh recency, ignore dismissed reports entirely)?
