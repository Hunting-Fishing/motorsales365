/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, colorForType } from "./google-maps-loader";

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

const PH_CENTER = { lat: 12.8797, lng: 121.774 };

function pinIcon(color: string, featured: boolean, highlighted = false): google.maps.Symbol {
  return {
    path: "M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: highlighted ? "#0ea5e9" : "#ffffff",
    strokeWeight: highlighted ? 4 : featured ? 3 : 2,
    scale: highlighted ? 1.6 : featured ? 1.4 : 1.1,
    anchor: new google.maps.Point(12, 34),
    labelOrigin: new google.maps.Point(12, 12),
  };
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise map once
  useEffect(() => {
    let disposed = false;
    loadGoogleMaps()
      .then((g) => {
        if (disposed || !containerRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: PH_CENTER,
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoRef.current = new g.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Map failed to load"));
    return () => {
      disposed = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      circleRef.current?.setMap(null);
      circleRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Render markers + adjust bounds whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const valid = businesses.filter(
      (b) => b.lat != null && b.lng != null && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng)),
    );

    valid.forEach((b) => {
      const color = colorForType(b.type_slug);
      const marker = new g.maps.Marker({
        position: { lat: Number(b.lat), lng: Number(b.lng) },
        map,
        title: b.name,
        icon: pinIcon(color, b.featured, b.highlighted),
        zIndex: b.highlighted ? 1000 : b.featured ? 500 : 1,
      });
      marker.addListener("click", () => {
        const rating =
          b.rating_count > 0
            ? `★ ${Number(b.rating_avg).toFixed(1)} <span style="color:#64748b">(${b.rating_count})</span>`
            : "";
        const price = b.price_label
          ? `<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-weight:600;font-size:12px">${escapeHtml(b.price_label)}</div>`
          : "";
        infoRef.current?.setContent(
          `<div style="font-family:inherit;min-width:180px;max-width:240px">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${escapeHtml(b.name)}</div>
            <div style="font-size:12px;color:#64748b">${escapeHtml(b.type_label)}${b.city ? " · " + escapeHtml(b.city) : ""}</div>
            ${rating ? `<div style="font-size:12px;margin-top:2px">${rating}</div>` : ""}
            ${price}
            <div style="margin-top:6px"><a style="font-size:12px;font-weight:600;color:#0ea5e9;text-decoration:underline;cursor:pointer" href="/businesses/${encodeURIComponent(b.slug)}">View business →</a></div>
          </div>`,
        );
        infoRef.current?.open({ map, anchor: marker });
        onPinClick?.(b.slug);
      });
      markersRef.current.push(marker);
    });

    // Centre / fit logic
    if (center) {
      map.setCenter(center);
      if (radiusKm && radiusKm > 0) {
        // Approx zoom for given radius
        const zoom = Math.max(8, Math.round(14 - Math.log2(radiusKm)));
        map.setZoom(zoom);
      } else {
        map.setZoom(12);
      }
    } else if (valid.length > 1) {
      const bounds = new g.maps.LatLngBounds();
      valid.forEach((b) => bounds.extend({ lat: Number(b.lat), lng: Number(b.lng) }));
      map.fitBounds(bounds, 48);
    } else if (valid.length === 1) {
      map.setCenter({ lat: Number(valid[0].lat), lng: Number(valid[0].lng) });
      map.setZoom(14);
    }

    // Radius circle
    circleRef.current?.setMap(null);
    circleRef.current = null;
    if (center && radiusKm && radiusKm > 0) {
      circleRef.current = new g.maps.Circle({
        map,
        center,
        radius: radiusKm * 1000,
        strokeColor: "#0ea5e9",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#0ea5e9",
        fillOpacity: 0.08,
      });
    }
  }, [ready, businesses, center?.lat, center?.lng, radiusKm, onPinClick]);

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
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
