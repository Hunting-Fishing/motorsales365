import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import regionCentroids from "@/data/ph-region-centroids.json";

const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
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

const PH_DEFAULT = { lat: 12.8797, lng: 121.774, zoom: 6 };

function Recenter({
  region,
  lat,
  lng,
}: {
  region: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (lat != null && lng != null) {
      if (!initialized.current) {
        map.setView([lat, lng], 16);
        initialized.current = true;
      }
      return;
    }
    if (region && (regionCentroids as any)[region]) {
      const c = (regionCentroids as any)[region];
      map.setView([c.lat, c.lng], c.zoom);
      return;
    }
    map.setView([PH_DEFAULT.lat, PH_DEFAULT.lng], PH_DEFAULT.zoom);
  }, [region, map, lat, lng]);
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

export function LocationPickerInner({
  lat,
  lng,
  region,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  region: string | null;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[PH_DEFAULT.lat, PH_DEFAULT.lng]}
        zoom={PH_DEFAULT.zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter region={region} lat={lat} lng={lng} />
        <ClickHandler onPick={onChange} />
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const p = m.getLatLng();
                onChange(p.lat, p.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
