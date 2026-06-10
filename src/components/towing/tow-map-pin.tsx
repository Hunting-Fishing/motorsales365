import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/tow-geo.functions";

declare global {
  interface Window {
    google?: any;
    __towMapInit?: () => void;
  }
}

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

let loadPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Missing Maps key"));
    window.__towMapInit = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__towMapInit${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Maps failed to load"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export type MapPinValue = {
  lat: number | null;
  lng: number | null;
  address: string | null;
};

type Props = {
  value: MapPinValue;
  onChange: (v: MapPinValue) => void;
  label?: string;
  required?: boolean;
};

export function TowMapPin({ value, onChange, label = "Pin exact location", required }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const reverse = useServerFn(reverseGeocode);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.maps) return;
        const center =
          value.lat != null && value.lng != null
            ? { lat: value.lat, lng: value.lng }
            : DEFAULT_CENTER;
        const map = new window.google.maps.Map(ref.current, {
          center,
          zoom: value.lat != null ? 16 : 11,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });
        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);

        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (!p) return;
          handlePick(p.lat(), p.lng());
        });
        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          handlePick(e.latLng.lat(), e.latLng.lng());
        });
      })
      .catch((e) => setErr(e?.message ?? "Map failed"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync if value changes externally (e.g., locate button)
  useEffect(() => {
    if (!ready || !markerRef.current || !mapRef.current) return;
    if (value.lat == null || value.lng == null) return;
    const pos = { lat: value.lat, lng: value.lng };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
  }, [ready, value.lat, value.lng]);

  async function handlePick(lat: number, lng: number) {
    setResolving(true);
    onChange({ lat, lng, address: value.address });
    try {
      const { address } = await reverse({ data: { lat, lng } });
      onChange({ lat, lng, address: address ?? null });
    } catch {
      // keep coords even if reverse fails
    } finally {
      setResolving(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setErr("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      (e) => setErr(e.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
          <LocateFixed className="mr-1.5 h-3.5 w-3.5" /> Use my location
        </Button>
      </div>
      <div
        ref={ref}
        className="h-64 w-full overflow-hidden rounded-md border border-border bg-muted"
      />
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {err ? (
          <span className="text-destructive">{err}</span>
        ) : value.lat != null && value.lng != null ? (
          <span>
            {value.address ?? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
            {resolving ? " · locating address…" : null}
          </span>
        ) : (
          <span>Tap or drag the marker to pin the exact spot.</span>
        )}
      </div>
    </div>
  );
}
