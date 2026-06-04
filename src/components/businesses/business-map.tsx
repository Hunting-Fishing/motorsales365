import { useEffect, useState, type ComponentType } from "react";

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

type Props = {
  businesses: MapBusiness[];
  region: string | null;
  onPinClick?: (slug: string) => void;
};

export function BusinessMap(props: Props) {
  const [Inner, setInner] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./business-map-inner").then((m) => {
      if (!cancelled) setInner(() => m.BusinessMapInner as ComponentType<Props>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Inner) {
    return (
      <div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted md:h-[560px]" />
    );
  }
  return <Inner {...props} />;
}
