import { lazy, Suspense, useEffect, useState } from "react";

const Inner = lazy(() =>
  import("./location-picker-inner").then((m) => ({ default: m.LocationPickerInner })),
);

export function LocationPicker(props: {
  lat: number | null;
  lng: number | null;
  region: string | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fallback = (
    <div className="h-[320px] w-full animate-pulse rounded-xl border border-border bg-muted" />
  );
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <Inner {...props} />
    </Suspense>
  );
}
