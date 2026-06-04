import { useEffect, useState, type ComponentType } from "react";

export type HeatPoint = {
  region: string | null;
  city: string | null;
  device: string | null;
  count: number;
};

type Props = {
  points: HeatPoint[];
  pointsB?: HeatPoint[] | null;
  labelA?: string;
  labelB?: string;
};

export function DeviceHeatmap(props: Props) {
  const [Inner, setInner] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./device-heatmap-inner").then((m) => {
      if (!cancelled) setInner(() => m.DeviceHeatmapInner as ComponentType<Props>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Inner) {
    return (
      <div className="h-[480px] w-full animate-pulse rounded-xl border border-border bg-muted" />
    );
  }
  return <Inner {...props} />;
}
