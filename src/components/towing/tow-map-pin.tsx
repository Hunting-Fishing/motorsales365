import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/tow-geo.functions";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

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

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const kick = () => map.invalidateSize();
    const t1 = setTimeout(kick, 0);
    const t2 = setTimeout(kick, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

export function TowMapPin({ value, onChange, label = "Pin exact location", required }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reverse = useServerFn(reverseGeocode);
  const valueRef = useRef(value);
  valueRef.current = value;

  async function handlePick(lat: number, lng: number) {
    setResolving(true);
    onChange({ lat, lng, address: valueRef.current.address });
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

  const center: [number, number] =
    value.lat != null && value.lng != null
      ? [value.lat, value.lng]
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  const initialZoom = value.lat != null ? 16 : 11;

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
      <div className="h-64 w-full overflow-hidden rounded-md border border-border bg-muted">
        {mounted ? (
          <MapContainer
            center={center}
            zoom={initialZoom}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <Recenter lat={value.lat} lng={value.lng} />
            <ClickHandler onPick={handlePick} />
            <InvalidateOnMount />
            {value.lat != null && value.lng != null && (
              <Marker
                position={[value.lat, value.lng]}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const p = m.getLatLng();
                    handlePick(p.lat, p.lng);
                  },
                }}
              />
            )}
          </MapContainer>
        ) : null}
      </div>
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
