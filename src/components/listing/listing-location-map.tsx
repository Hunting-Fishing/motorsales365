import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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

type Props = {
  lat: number;
  lng: number;
  city?: string | null;
  region?: string | null;
};

/**
 * Small embedded map for the listing sidebar. Renders an approximate-area
 * circle (~300m) rather than a precise marker to protect the seller's
 * home address, similar to Facebook Marketplace's approximate location UI.
 */
export function ListingLocationMap({ lat, lng, city, region }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Jitter to ~3 decimals (~110m) so the circle centre isn't the exact pin
  const cLat = Math.round(lat * 1000) / 1000;
  const cLng = Math.round(lng * 1000) / 1000;
  const label = [city, region].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-40 w-full bg-muted">
        {mounted ? (
          <MapContainer
            center={[cLat, cLng]}
            zoom={13}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <InvalidateOnMount />
            <Circle
              center={[cLat, cLng]}
              radius={400}
              pathOptions={{
                color: "hsl(var(--primary))",
                fillColor: "hsl(var(--primary))",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </MapContainer>
        ) : null}
      </div>
      <div className="flex items-start gap-1.5 px-3 py-2 text-[11px] text-muted-foreground">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Approximate area{label ? ` — ${label}` : ""}</span>
      </div>
    </div>
  );
}
