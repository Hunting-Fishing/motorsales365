import { useEffect, useState, type ComponentType } from "react";
import type { BusinessesMapInner as InnerType } from "./businesses-map-inner";

export type { GMapBusiness } from "./businesses-map-inner";

type InnerProps = React.ComponentProps<typeof InnerType>;

export function BusinessesMap(props: InnerProps) {
  const [Inner, setInner] = useState<ComponentType<InnerProps> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./businesses-map-inner").then((m) => {
      if (!cancelled) setInner(() => m.BusinessesMapInner as ComponentType<InnerProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const height = (props as { height?: number | string }).height ?? 520;
  if (!Inner) {
    return (
      <div
        className="w-full animate-pulse rounded-xl border border-border bg-muted"
        style={{ height }}
      />
    );
  }
  return <Inner {...props} />;
}
