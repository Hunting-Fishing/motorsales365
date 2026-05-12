import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import regionCentroids from "@/data/ph-region-centroids.json";

// Fix default marker icons (Vite-bundled)
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const featuredIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-weight:700;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid white;">★</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

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

const PH_DEFAULT = { lat: 12.8797, lng: 121.774, zoom: 6 };

function ViewController({ region, businesses }: { region: string | null; businesses: MapBusiness[] }) {
  const map = useMap();
  useEffect(() => {
    const pinned = businesses.filter((b) => b.lat != null && b.lng != null);
    if (pinned.length > 1) {
      const bounds = L.latLngBounds(pinned.map((b) => [b.lat!, b.lng!] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      return;
    }
    if (pinned.length === 1) {
      map.setView([pinned[0].lat!, pinned[0].lng!], 13);
      return;
    }
    if (region && (regionCentroids as any)[region]) {
      const c = (regionCentroids as any)[region];
      map.setView([c.lat, c.lng], c.zoom);
      return;
    }
    map.setView([PH_DEFAULT.lat, PH_DEFAULT.lng], PH_DEFAULT.zoom);
  }, [region, businesses, map]);
  return null;
}

export function BusinessMap({
  businesses,
  region,
  onPinClick,
}: {
  businesses: MapBusiness[];
  region: string | null;
  onPinClick?: (slug: string) => void;
}) {
  const ref = useRef<L.Map | null>(null);
  const pinned = useMemo(() => businesses.filter((b) => b.lat != null && b.lng != null), [businesses]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border md:h-[560px]">
      <MapContainer
        center={[PH_DEFAULT.lat, PH_DEFAULT.lng]}
        zoom={PH_DEFAULT.zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        ref={ref as any}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewController region={region} businesses={businesses} />
        {pinned.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat!, b.lng!]}
            icon={b.featured ? featuredIcon : DefaultIcon}
            eventHandlers={{ click: () => onPinClick?.(b.slug) }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs opacity-80">{b.type_label}{b.city ? ` · ${b.city}` : ""}</div>
                {b.rating_count > 0 && (
                  <div className="text-xs">★ {Number(b.rating_avg).toFixed(1)} ({b.rating_count})</div>
                )}
                <a href={`/businesses/${b.slug}`} className="text-xs font-medium text-primary underline">View business →</a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
