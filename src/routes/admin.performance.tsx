import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gauge, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_PERF_SETTINGS,
  getPerfSettings,
  setPerfSettings,
  type PerfSettings,
} from "@/lib/perf-settings";
import { ImageMetricsPanel } from "@/components/image-metrics-panel";

export const Route = createFileRoute("/admin/performance")({
  component: AdminPerformance,
});

const PRESETS: { label: string; description: string; values: PerfSettings }[] = [
  {
    label: "Conservative (slow 3G / rural PH)",
    description: "Minimize data usage on weak connections.",
    values: { rootMargin: "150px", thumbWidth: 360, fullWidth: 960, quality: 60 },
  },
  {
    label: "Balanced (default)",
    description: "Recommended for most Philippine mobile connections.",
    values: DEFAULT_PERF_SETTINGS,
  },
  {
    label: "Aggressive (fiber / desktop)",
    description: "Preload further, higher resolution thumbnails.",
    values: { rootMargin: "800px", thumbWidth: 640, fullWidth: 1600, quality: 85 },
  },
];

function AdminPerformance() {
  const [s, setS] = useState<PerfSettings>(DEFAULT_PERF_SETTINGS);

  useEffect(() => {
    setS(getPerfSettings());
  }, []);

  const update = (patch: Partial<PerfSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    setPerfSettings(patch);
  };

  const apply = (preset: PerfSettings) => {
    setS(preset);
    setPerfSettings(preset);
    toast.success("Preset applied");
  };

  const reset = () => {
    setS(DEFAULT_PERF_SETTINGS);
    setPerfSettings(DEFAULT_PERF_SETTINGS);
    toast.success("Reset to defaults");
  };

  // Parse rootMargin "Npx" → number for the slider
  const rootMarginPx = Number.parseInt(s.rootMargin, 10) || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold">Image performance</h1>
          <p className="text-sm text-muted-foreground">
            Tune image preload distance and resolution. Changes apply instantly to this device — useful
            for testing on Philippine mobile connections.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <Gauge className="h-5 w-5" /> Presets
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => apply(p.values)}
              className="rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="font-semibold">{p.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>Preload: {p.values.rootMargin}</span>
                <span>Quality: {p.values.quality}</span>
                <span>Thumb: {p.values.thumbWidth}px</span>
                <span>Full: {p.values.fullWidth}px</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Manual tuning</h2>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label>Preload distance (rootMargin)</Label>
            <span className="font-mono text-sm text-muted-foreground">{s.rootMargin}</span>
          </div>
          <Slider
            value={[rootMarginPx]}
            min={0}
            max={1500}
            step={50}
            onValueChange={([v]) => update({ rootMargin: `${v}px` })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            How far outside the viewport images start loading. Lower = save data; higher = smoother scroll.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label>Image quality</Label>
            <span className="font-mono text-sm text-muted-foreground">{s.quality}</span>
          </div>
          <Slider
            value={[s.quality]}
            min={30}
            max={95}
            step={5}
            onValueChange={([v]) => update({ quality: v })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Thumbnail width (px)</Label>
            <Input
              type="number"
              value={s.thumbWidth}
              onChange={(e) => update({ thumbWidth: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">Used for listing cards & thumbnails.</p>
          </div>
          <div>
            <Label>Full-size width (px)</Label>
            <Input
              type="number"
              value={s.fullWidth}
              onChange={(e) => update({ fullWidth: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">Used for the main listing gallery image.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
