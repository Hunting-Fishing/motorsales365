
## 1. Competitor pricing + expanded roster

**Data model (`src/data/competitors-shop-software.ts`)**

Extend the `Competitor` type with pricing metadata:

```ts
type Competitor = {
  id: string; name: string; blurb: string; logo?: string;
  pricing: {
    startingUsd: number | null; // null = free / custom
    unit: "mo" | "yr" | "custom" | "free";
    tierName: string;             // e.g. "Starter", "Basic"
    includes: string[];           // 2-4 short bullets
    highest?: string;             // top tier summary (e.g. "Ultimate $499/mo")
    link: string;                 // pricing page URL
  };
};
```

Add competitors (both matrices):

- **Shop software matrix**: keep the 6 current + add **ARI** ($39.95/mo), **Fullbay** (heavy-duty, custom), **RepairShopr / Torque360** ($59/mo), **Protractor**, **Identifix Shop Manager**, **Manager SE (Mitchell 1)**, **NAPA TRACS**, **Bay-masteR**.
- **Marketplace matrix**: add **CarMudi**, **Cars.com.ph**, **AutoTrader (regional)**.

Add a starting-price row at the top of each capability matrix showing the price as a pill (green "Free" for 365).

**New component: `CompetitorPricingRail`**

`src/components/features/competitor-pricing-rail.tsx` — horizontal snap-scroll strip above each matrix. Each card shows: logo/name, tier name, big price, unit, 3 includes, "vs 365" mini-badge (Cheaper / Similar / We're free), and pricing link. Uses `overflow-x-auto snap-x snap-mandatory` with left/right chevron buttons and a subtle fade mask on edges. Sticky "You are here" card for 365 stays leftmost.

## 2. Wider scrolling matrix

Update `ComparisonTable` to support many competitors:
- Container becomes horizontally scrollable with sticky first column already in place.
- Add optional min-width bump per competitor count.
- Add a "compact" toggle that hides notes for scan-mode.

## 3. Real screenshots — database-backed, versioned

**Storage bucket**: `feature-screenshots` (public read, service-role write).

**Table**: `feature_screenshots`
```
id uuid pk
feature_id text not null      -- matches Feature.id in catalog
route text not null
url text not null              -- public storage URL
viewport text not null default 'desktop'  -- desktop|mobile
captured_at timestamptz default now()
captured_by text                -- 'auto' | user email
notes text
is_pinned boolean default false
sha256 text                     -- dedupe identical captures
```

Policies: public SELECT; admin-only INSERT/UPDATE/DELETE. Grants for anon (SELECT) + authenticated + service_role.

**Server functions (`src/lib/feature-screenshots.functions.ts`)**
- `listLatestScreenshots()` — returns `Record<featureId, ScreenshotRow>` (latest per feature, prefers `is_pinned`).
- `listScreenshotHistory(featureId)` — for the version drawer.
- `pinScreenshot({ id })` / `unpinScreenshot` — admin only.
- `captureFeatureScreenshot({ featureId })` — admin/cron only.
- `captureAllFeatureScreenshots()` — iterates catalog, capture cadence guard (skip if last <7d).

**Auto-capture pipeline**

Cloudflare Workers can't run Puppeteer, so use an external screenshot API. Default to **ScreenshotOne** (free tier + reasonable paid plan) via a `SCREENSHOTONE_ACCESS_KEY` secret. In `captureFeatureScreenshot`:
1. Build target URL: `https://www.365motorsales.com{route}?__screenshot=1`.
2. GET `https://api.screenshotone.com/take?url=...&viewport_width=1440&viewport_height=900&full_page=false&block_ads=true&format=jpg&image_quality=80` with access key.
3. Upload the returned bytes to `feature-screenshots/{featureId}/{timestamp}.jpg`.
4. Compute SHA-256; if identical to last row for feature, skip insert.
5. Insert row.

**Scheduling**

Server route `/api/public/cron/capture-feature-screenshots.ts` (auth via `apikey` header = anon key). Iterates catalog features with `route`, respects a 7-day cadence, throttles 2s between calls. `pg_cron` hits it Sunday 03:00 PHT.

**Admin control page**

`/admin/feature-screenshots` (already-existing admin gate):
- Grid of features with current screenshot thumbnail, capture date, "Capture now", "Upload manually", "View history" (drawer with all versions + pin), "Open on live site".
- Manual upload uses standard file input → storage → row insert with `captured_by = <email>`.

## 4. Wire screenshots into `/features`

Replace `FeaturePreview` iframe with `FeatureScreenshot`:
- Reads `latestScreenshots[feature.id]` from a route loader (public server fn).
- Shows the JPEG with a subtle "Captured Nov 12, 2026" badge and a "View history" link (drawer of thumbnails ordered newest-first).
- Fallback when no screenshot: existing designed placeholder + "Capture pending" pill.
- Adds a click-to-zoom lightbox instead of the iframe hover overlay.

## 5. Files to add / edit

**Add:**
- `src/components/features/competitor-pricing-rail.tsx`
- `src/components/features/feature-screenshot.tsx` (+ history drawer, lightbox)
- `src/lib/feature-screenshots.functions.ts`
- `src/routes/api/public/cron/capture-feature-screenshots.ts`
- `src/routes/_authenticated/admin.feature-screenshots.tsx`
- Migration: `feature_screenshots` table + `feature-screenshots` storage bucket + RLS + grants + pg_cron entry.

**Edit:**
- `src/data/competitors-shop-software.ts` — extend types, add pricing, add competitors.
- `src/components/features/comparison-table.tsx` — starting-price row, compact toggle, wider min-widths.
- `src/components/features/feature-row.tsx` — swap `FeaturePreview` → `FeatureScreenshot`, wire loader data.
- `src/routes/features.tsx` — loader calls `listLatestScreenshots()`; render pricing rails above each matrix.

## 6. Requires from user

I'll need a **ScreenshotOne API key** (free tier is enough for weekly captures of ~30 features). I'll request it via the `add_secret` tool as `SCREENSHOTONE_ACCESS_KEY` when we start building — if you'd rather use Urlbox / ApiFlash / Browserless, tell me and I'll swap the provider. Manual upload works without any key.

## 7. Out of scope (this pass)

- Diff view between two screenshot versions (side-by-side compare) — can add later.
- Mobile-viewport captures — schema supports it, but I'll ship desktop only first.
- Automated captures on git commit — cron weekly is enough to start.
