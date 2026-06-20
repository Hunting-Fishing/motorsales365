## What to remove

The "Promoter preview / Tracking is disabled in preview mode" banner that renders at the top of `QrLandingContent` whenever `preview` is true. It currently shows on `/resources/qr-landing` for every promoter viewing the page, and reads like an unfinished beta disclaimer.

## Change

In `src/components/qr-landing-content.tsx`, delete the entire conditional block:

```tsx
{preview && (
  <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
    <Eye … />
    <div className="flex-1">
      <p className="font-semibold text-foreground">Promoter preview</p>
      <p className="text-muted-foreground">Tracking is disabled in preview mode.</p>
    </div>
  </div>
)}
```

Keep the `preview` prop itself — it still controls real behavior (skip the `record_qr_scan` call, skip the visit-history banner, swap the headline to "Your name will appear here"). Only the visible "preview" banner is removed. If the `Eye` icon import becomes unused after the delete, remove it from the lucide-react import list too.

## Rest of the page assessment

I went through the rest of `QrLandingContent` while I had it open. Nothing else reads as beta/placeholder/disabled wording to a scanner: the hero, audience panels, trust cards, how-it-works, categories, comparison table, safety section, FAQ, and CTA all read as finished marketing copy. The wrapper page `src/routes/resources/qr-landing.tsx` keeps its "QR Landing Preview / Promoter resources" header — that header is fine because it's the promoter-facing tooling page (with My QR & stats, Print materials, Leads admin buttons), not something a scanner sees.

No other files change.

## Verification

Reload `/resources/qr-landing` — the blue "Promoter preview" banner is gone, the page now opens straight into the hero. Live `/r/$code` is unchanged (the banner only ever rendered in preview mode).
