import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Eye, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getImageEvents,
  subscribeImageMetrics,
  summarize,
  clearImageMetrics,
  type ImageEvent,
} from "@/lib/image-metrics";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ms(n: number) {
  if (!n) return "—";
  return n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`;
}

interface BreakdownRow {
  key: string;
  samples: number;
  preloadHitRate: number;
  avgMs: number;
  errors: number;
}

function breakdown(events: ImageEvent[], by: (e: ImageEvent) => string): BreakdownRow[] {
  const groups = new Map<string, ImageEvent[]>();
  for (const e of events) {
    const k = by(e);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  return Array.from(groups.entries())
    .map(([key, evs]) => {
      const s = summarize(evs);
      return {
        key,
        samples: s.loads + s.errors,
        preloadHitRate: s.preloadHitRate,
        avgMs: s.avgMs,
        errors: s.errors,
      };
    })
    .sort((a, b) => b.samples - a.samples);
}

export function ImageMetricsPanel() {
  const [events, setEvents] = useState<ImageEvent[]>([]);

  useEffect(() => {
    setEvents(getImageEvents());
    return subscribeImageMetrics(() => setEvents(getImageEvents()));
  }, []);

  const summary = useMemo(() => summarize(events), [events]);
  const byRoot = useMemo(
    () => breakdown(events, (e) => e.rootMargin ?? ""),
    [events],
  );
  const byQuality = useMemo(
    () => breakdown(events, (e) => (e.quality != null ? `${e.quality}` : "")),
    [events],
  );

  const stats = [
    {
      Icon: Eye,
      label: "Preload hit rate",
      value: summary.visibleSamples ? pct(summary.preloadHitRate) : "—",
      sub: `${summary.preloadHits}/${summary.visibleSamples} images ready before visible`,
    },
    {
      Icon: Timer,
      label: "Avg load time",
      value: ms(summary.avgMs),
      sub: `p50 ${ms(summary.p50Ms)} · p95 ${ms(summary.p95Ms)}`,
    },
    {
      Icon: AlertTriangle,
      label: "Failures",
      value: `${summary.errors}`,
      sub: `${pct(summary.errorRate)} of ${summary.loads + summary.errors} attempts`,
    },
    {
      Icon: Activity,
      label: "Samples",
      value: `${summary.total}`,
      sub: "Most recent 500 events",
    },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Image performance metrics</h2>
          <p className="text-sm text-muted-foreground">
            Live data from this device's session. Use it to gauge whether the current preload distance
            and quality are right for your connection.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearImageMetrics}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ Icon, label, value, sub }) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4" /> {label}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable title="By rootMargin" rows={byRoot} keyHeader="rootMargin" />
        <BreakdownTable title="By quality" rows={byQuality} keyHeader="quality" />
      </div>

      {events.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No samples yet. Browse the site to collect image load metrics.
        </div>
      )}
    </section>
  );
}

function BreakdownTable({
  title,
  rows,
  keyHeader,
}: {
  title: string;
  rows: BreakdownRow[];
  keyHeader: string;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-2 text-sm font-semibold">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">No data</div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">{keyHeader}</th>
              <th className="px-4 py-2 text-right">Samples</th>
              <th className="px-4 py-2 text-right">Preload hit</th>
              <th className="px-4 py-2 text-right">Avg load</th>
              <th className="px-4 py-2 text-right">Errors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="px-4 py-2 font-mono">{r.key}</td>
                <td className="px-4 py-2 text-right">{r.samples}</td>
                <td className="px-4 py-2 text-right">{pct(r.preloadHitRate)}</td>
                <td className="px-4 py-2 text-right">{ms(r.avgMs)}</td>
                <td className="px-4 py-2 text-right">{r.errors}</td>
              </tr>
            ))}
          </tbody>
        </table></div>

      )}
    </div>
  );
}
