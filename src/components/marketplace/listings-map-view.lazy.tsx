import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { ListingCardData } from "@/components/listing-card";

const Inner = lazy(() =>
  import("./listings-map-view").then((m) => ({ default: m.ListingsMapView })),
);

const Fallback = (
  <div className="h-[520px] w-full rounded-lg border bg-muted/20 animate-pulse" />
);

export function ListingsMapView({ listings }: { listings: ListingCardData[] }) {
  return (
    <ClientOnly fallback={Fallback}>
      <Suspense fallback={Fallback}>
        <Inner listings={listings} />
      </Suspense>
    </ClientOnly>
  );
}
