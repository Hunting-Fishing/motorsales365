import { lazy, Suspense, useEffect, useState } from "react";

export type MapBusiness = {
  id: string;
  slug: string;
  name: string;
  type_label: string;
  lat: number | null;
  lng: number | null;
  rating_avg: number;
  rating_count: number;
  city: string | null;
  featured: boolean;
};

const InnerMap = lazy(() => import("./business-map-inner").then((m) => ({ default: m.BusinessMapInner })));

export function BusinessMap(props: {
  businesses: MapBusiness[];
  region: string | null;
  onPinClick?: (slug: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted md:h-[560px]" />;
  }
  return (
    <Suspense fallback={<div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted md:h-[560px]" />}>
      <InnerMap {...props} />
    </Suspense>
  );
}
