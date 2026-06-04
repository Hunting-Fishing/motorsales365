import { useEffect, useState, type ComponentType } from "react";

type Props = {
  lat: number | null;
  lng: number | null;
  region: string | null;
  onChange: (lat: number, lng: number) => void;
};

export function LocationPicker(props: Props) {
  const [Inner, setInner] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./location-picker-inner").then((m) => {
      if (!cancelled) setInner(() => m.LocationPickerInner as ComponentType<Props>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Inner) {
    return <div className="h-[320px] w-full animate-pulse rounded-xl border border-border bg-muted" />;
  }
  return <Inner {...props} />;
}
