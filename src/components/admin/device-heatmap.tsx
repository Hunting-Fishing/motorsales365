import { lazy, Suspense, useEffect, useState } from "react";

export type HeatPoint = {
  region: string | null;
  city: string | null;
  device: string | null;
  count: number;
};

const Inner = lazy(() =>
  import("./device-heatmap-inner").then((m) => ({ default: m.DeviceHeatmapInner })),
);

export function DeviceHeatmap({
  points,
  pointsB,
  labelA,
  labelB,
}: {
  points: HeatPoint[];
  pointsB?: HeatPoint[] | null;
  labelA?: string;
  labelB?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="h-[480px] w-full animate-pulse rounded-xl border border-border bg-muted" />
    );
  }
  return (
    <Suspense
      fallback={
        <div className="h-[480px] w-full animate-pulse rounded-xl border border-border bg-muted" />
      }
    >
      <Inner points={points} pointsB={pointsB} labelA={labelA} labelB={labelB} />
    </Suspense>
  );
}
