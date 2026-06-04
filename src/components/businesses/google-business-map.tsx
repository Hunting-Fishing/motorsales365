import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";
import type { GoogleBusinessMapInner as InnerType } from "./google-business-map-inner";

export type { GMapBusiness } from "./google-business-map-inner";

const Inner = lazy(() =>
  import("./google-business-map-inner").then((m) => ({ default: m.GoogleBusinessMapInner })),
);

type InnerProps = ComponentProps<typeof InnerType>;


export function GoogleBusinessMap(props: InnerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const height = (props as any).height ?? 520;
  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-xl border border-border bg-muted"
        style={{ height }}
      />
    );
  }
  return (
    <Suspense
      fallback={
        <div
          className="w-full animate-pulse rounded-xl border border-border bg-muted"
          style={{ height }}
        />
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}
