import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { colorForType } from "./google-maps-loader";


export type GMapBusiness = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  type_label: string;
  lat: number | null;
  lng: number | null;
  rating_avg: number;
  rating_count: number;
  city: string | null;
  featured: boolean;
  price_label?: string | null;
  highlighted?: boolean;
};

const PH_CENTER: [number, number] = [12.8797, 121.774];

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0);

function pinDivIcon(
  color: string,
  featured: boolean,
  highlighted = false,
  typeSlug?: string,
): L.DivIcon {
  const touchBoost = isTouchDevice() ? 1.2 : 1;
  const scale = (highlighted ? 1.6 : featured ? 1.4 : 1.1) * touchBoost;

  // Fuel-station: render a fuel-pump badge instead of the generic teardrop.
  if (typeSlug === "fuel_station") {
    const size = 34 * scale;
    const stroke = highlighted ? "#0ea5e9" : "#ffffff";
    const strokeW = highlighted ? 3 : 2;
    // Inlined Lucide "fuel" path, white on colored circle.
    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:${color};border:${strokeW}px solid ${stroke};box-shadow:0 2px 4px rgba(0,0,0,0.35)">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="22" x2="15" y2="22"/>
          <line x1="4" y1="9" x2="14" y2="9"/>
          <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/>
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
        </svg>
      </div>`;
    return L.divIcon({
      html,
      className: "lovable-map-pin",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 + 4],
    });
  }

  const w = 24 * scale;
  const h = 34 * scale;
  const stroke = highlighted ? "#0ea5e9" : "#ffffff";
  const strokeW = highlighted ? 4 : featured ? 3 : 2;
  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 34" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
            fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.95"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "lovable-map-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

export function GoogleBusinessMap({
  businesses,
  height = 520,
  center,
  radiusKm,
  onPinClick,
}: {
  businesses: GMapBusiness[];
  height?: number | string;
  center?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  onPinClick?: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const map = L.map(containerRef.current, {
        center: PH_CENTER,
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Map failed to load");
    }
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      circleRef.current?.remove();
      circleRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers + adjust bounds whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = businesses.filter(
      (b) =>
        b.lat != null &&
        b.lng != null &&
        Number.isFinite(Number(b.lat)) &&
        Number.isFinite(Number(b.lng)),
    );

    valid.forEach((b) => {
      const color = colorForType(b.type_slug);
      const marker = L.marker([Number(b.lat), Number(b.lng)], {
        icon: pinDivIcon(color, b.featured, b.highlighted, b.type_slug),
        title: b.name,
        zIndexOffset: b.highlighted ? 1000 : b.featured ? 500 : 0,
      }).addTo(map);

      const rating =
        b.rating_count > 0
          ? `★ ${Number(b.rating_avg).toFixed(1)} <span style="color:#64748b">(${b.rating_count})</span>`
          : "";
      const price = b.price_label
        ? `<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-weight:600;font-size:12px">${escapeHtml(b.price_label)}</div>`
        : "";
      const html = `<div style="font-family:inherit;min-width:180px;max-width:240px">
        <div style="font-weight:600;font-size:14px;margin-bottom:2px">${escapeHtml(b.name)}</div>
        <div style="font-size:12px;color:#64748b">${escapeHtml(b.type_label)}${b.city ? " · " + escapeHtml(b.city) : ""}</div>
        ${rating ? `<div style="font-size:12px;margin-top:2px">${rating}</div>` : ""}
        ${price}
        <div style="margin-top:6px"><a style="font-size:12px;font-weight:600;color:#0ea5e9;text-decoration:underline;cursor:pointer" href="/businesses/${encodeURIComponent(b.slug)}">View business →</a></div>
      </div>`;
      marker.bindPopup(html, { closeButton: true, maxWidth: 260 });
      marker.on("click", () => onPinClick?.(b.slug));
      markersRef.current.push(marker);
    });

    // Centre / fit logic
    if (center) {
      if (radiusKm && radiusKm > 0) {
        const zoom = Math.max(8, Math.round(14 - Math.log2(radiusKm)));
        map.setView([center.lat, center.lng], zoom);
      } else {
        map.setView([center.lat, center.lng], 12);
      }
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(
        valid.map((b) => [Number(b.lat), Number(b.lng)] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    } else if (valid.length === 1) {
      map.setView([Number(valid[0].lat), Number(valid[0].lng)], 14);
    }

    // Radius circle
    circleRef.current?.remove();
    circleRef.current = null;
    if (center && radiusKm && radiusKm > 0) {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: "#0ea5e9",
        opacity: 0.6,
        weight: 2,
        fillColor: "#0ea5e9",
        fillOpacity: 0.08,
      }).addTo(map);
    }
    // reason: we depend on center.lat/center.lng explicitly to avoid re-runs on object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, businesses, center?.lat, center?.lng, radiusKm, onPinClick]);

  // Invalidate size when container size changes (e.g. bottom sheet snaps)
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground"
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ height }}
    />
  );
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
