import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Clock, ExternalLink, History, Loader2, X, ImageIcon, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listFeatureScreenshotHistory } from "@/lib/feature-screenshots.functions";

export type LatestScreenshot = {
  id: string;
  url: string;
  captured_at: string;
  is_pinned: boolean;
  captured_by?: string | null;
} | null;

function niceDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Renders a captured screenshot for a feature. Falls back to a designed
 * placeholder when no capture exists yet. Click opens a full-size lightbox.
 * A "History" pill opens a drawer of every past capture for this feature.
 */
export function FeatureScreenshot({
  featureId,
  route,
  label,
  latest,
}: {
  featureId: string;
  route: string;
  label: string;
  latest: LatestScreenshot;
}) {
  const [zoom, setZoom] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="group/preview relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-gradient-to-br from-secondary/40 via-background to-secondary/20 shadow-sm ring-1 ring-black/5">
      {latest?.url ? (
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute inset-0 h-full w-full"
          aria-label={`Zoom screenshot of ${label}`}
        >
          <img
            src={latest.url}
            alt={`Screenshot of ${label}`}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover/preview:scale-[1.02]"
          />
        </button>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="text-xs font-medium">Capture pending</div>
          <div className="text-[11px] opacity-70">Screenshot will appear here after the next capture</div>
        </div>
      )}

      {/* Top-left: route badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
          {route}
        </span>
        {latest?.is_pinned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
            <Pin className="h-2.5 w-2.5" /> pinned
          </span>
        )}
      </div>

      {/* Top-right: captured badge */}
      {latest?.captured_at && (
        <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
          <Camera className="h-2.5 w-2.5" /> {niceDate(latest.captured_at)}
        </div>
      )}

      {/* Bottom action row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-background/85 via-background/40 to-transparent p-3">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow ring-1 ring-border backdrop-blur transition hover:bg-secondary"
        >
          <History className="h-3 w-3" /> History
        </button>
        <a
          href={route}
          target="_blank"
          rel="noopener"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow ring-1 ring-border backdrop-blur transition hover:bg-secondary"
        >
          <ExternalLink className="h-3 w-3" /> Open page
        </a>
      </div>

      {/* Zoom lightbox */}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-5xl p-2">
          <DialogHeader className="px-2 pt-1">
            <DialogTitle className="text-sm">
              {label} · <span className="font-mono text-xs text-muted-foreground">{route}</span>
            </DialogTitle>
          </DialogHeader>
          {latest?.url && (
            <img src={latest.url} alt={`Screenshot of ${label}`} className="w-full rounded-md" />
          )}
          {latest?.captured_at && (
            <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Captured {niceDate(latest.captured_at)}
              </span>
              {latest.captured_by && <span>by {latest.captured_by}</span>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {historyOpen && (
        <HistoryDrawer
          featureId={featureId}
          label={label}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

function HistoryDrawer({
  featureId,
  label,
  onClose,
}: {
  featureId: string;
  label: string;
  onClose: () => void;
}) {
  const fetchHistory = useServerFn(listFeatureScreenshotHistory);
  const [rows, setRows] = useState<
    { id: string; url: string; captured_at: string; captured_by: string | null; is_pinned: boolean; notes: string | null }[]
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchHistory({ data: { featureId } })
      .then((r) => alive && setRows(r.history))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [featureId, fetchHistory]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> {label} — capture history
          </DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!rows ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No captures yet for this feature.</p>
        ) : (
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card p-2 shadow-sm">
                <img src={r.url} alt="" className="aspect-[16/10] w-full rounded object-cover object-top" />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {niceDate(r.captured_at)}
                  </span>
                  {r.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Pin className="h-3 w-3" /> pinned
                    </span>
                  )}
                </div>
                {r.captured_by && <div className="text-[10px] text-muted-foreground">by {r.captured_by}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-right">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="mr-1 h-3.5 w-3.5" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
