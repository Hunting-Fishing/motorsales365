import { useEffect, useState, type ComponentType } from "react";
import type { GoogleBusinessMapInner as InnerType } from "./google-business-map-inner";

export type { GMapBusiness } from "./google-business-map-inner";

type InnerProps = React.ComponentProps<typeof InnerType>;

export function GoogleBusinessMap(props: InnerProps) {
  const [Inner, setInner] = useState<ComponentType<InnerProps> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./google-business-map-inner").then((m) => {
      if (!cancelled) setInner(() => m.GoogleBusinessMapInner as ComponentType<InnerProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const height = (props as any).height ?? 520;
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
