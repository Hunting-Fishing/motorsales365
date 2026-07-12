## Extend "New" window to 72h, recolor rings, add "Re-listed" state

### 1. New badge window: 48h → 72h
- `src/components/listings/new-badge.tsx`: change the age check from `48 * 60 * 60 * 1000` to `72 * 60 * 60 * 1000`.
- `src/components/listing-card.tsx`: same 48h→72h threshold in the ring-priority logic and in the "doubled outline" check so the ring/badge stay in sync.
- `src/components/listings/renewed-badge.tsx`: bump its "skip if publishedAt < 48h" guard to 72h so NEW keeps priority for the full new window.
- Note in copy: sellers can still buy a Boost to keep visibility after the 72h window (no code change — Boost already lives on `boost_until`).

### 2. Recolor rings
- `src/components/listing-card.tsx`: swap the ring class used for the "New (72h)" state from `ring-fuchsia-500/80` to `ring-blue-600/80` (royal blue). Everywhere fuchsia was used for New — replace with blue.
- Free up hot-pink (`ring-fuchsia-500/80`) for the new "Re-listed after expiry" state (below).
- On-image `NewBadge` stays emerald green (that's the pill on the photo, unchanged) — only the card ring changes to royal blue, matching how other states pair a colored ring with a colored pill.

### 3. New "Re-listed after expiry" state
- Detection rule (client-side, no schema change): a listing is "Re-listed" when its current `status = 'active'` AND `updated_at` is within the last 72h AND there is a prior expiry, detected as `published_at` older than the platform's active window (>60 days ago) OR `expires_at` in the past relative to `updated_at`. If `expires_at` is not consistently populated on the row, fall back to: `published_at` older than 60 days AND `updated_at` within 72h AND `status = 'active'`.
- New component `src/components/listings/relisted-badge.tsx`: hot-pink on-image pill "Re-listed" with a `RotateCcw` icon, same visual weight as `RenewedBadge`.
- `src/components/listing-card.tsx`:
  - Compute `isRelisted` alongside `isNew` / `isRenewed`.
  - Ring priority (updated): Reported → Pending Sale → Featured → **Re-listed (fuchsia)** → **New (royal blue)** → Renewed (teal) → Price Drop → Price Up → Promo → Boosted → Match → Category → Dealer.
  - Badge stack: insert `<RelistedBadge />` right after Pending Sale, before New. Re-listed suppresses Renewed (same way New does) to avoid two "freshness" pills at once.
  - "Doubled outline" still means New + recently touched; Re-listed does not double-outline (it's already its own signal).

### 4. Legend updates
- `src/components/marketplace/listing-legend.tsx`:
  - On-image badges section: add a "Re-listed" row (hot-pink pill with `RotateCcw`) between Renewed and Promo. Update "New" copy to "Listed within the last 72 hours."
  - Card ring colors section:
    - Change "New (48h)" entry to "New (72h)" and swatch to `ring-blue-600/80` with copy "Royal blue — freshly posted in the last 72 hours."
    - Add "Re-listed" entry with `ring-fuchsia-500/80` swatch and copy "Hot pink — previously expired listing that the seller brought back."
  - Double-outline section: update the sample swatch ring from fuchsia to `ring-blue-600/80` so the illustration matches the new New color.

### 5. Verification
- Load `/browse/car` and confirm the 2007 Civic (under 72h) shows the green "NEW" pill and a royal-blue ring.
- Open the Legend popover and confirm New is royal blue and Re-listed (hot pink) is described.
- Sanity-check a listing manually flagged as re-listed shows a hot-pink ring + "Re-listed" pill and no Renewed pill.

### Not in scope
- No DB migration. If later we want a hard `relisted_at` timestamp for stricter detection, that's a follow-up.
- Boost purchase flow — unchanged; already governs post-72h visibility.
