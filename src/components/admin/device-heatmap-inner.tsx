import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import regionCentroids from "@/data/ph-region-centroids.json";
import type { HeatPoint } from "./device-heatmap";

const PH = { lat: 12.8797, lng: 121.774, zoom: 6 };

type DeviceFilter = "all" | "mobile" | "tablet" | "desktop" | "bot";

const DEVICE_COLOR: Record<string, string> = {
  mobile: "#2563eb",
  desktop: "#16a34a",
  tablet: "#a855f7",
  bot: "#64748b",
  unknown: "#94a3b8",
};

function matchRegion(name: string | null): { lat: number; lng: number } | null {
  if (!name) return null;
  const dict = regionCentroids as Record<string, { lat: number; lng: number }>;
  if (dict[name]) return dict[name];
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(dict)) {
    const kl = k.toLowerCase();
    if (kl.includes(n) || n.includes(kl.split("—")[0].trim().toLowerCase())) return v;
  }
  return null;
}

function HeatLayer({ data }: { data: Array<[number, number, number]> }) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!data.length) return;
    const layer = (L as any).heatLayer(data, {
      radius: 38,
      blur: 28,
      maxZoom: 10,
      minOpacity: 0.35,
      gradient: { 0.2: "#2563eb", 0.4: "#22c55e", 0.6: "#eab308", 0.8: "#f97316", 1.0: "#ef4444" },
    }).addTo(map);
    layerRef.current = layer;
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [data, map]);
  return null;
}

export function DeviceHeatmapInner({ points }: { points: HeatPoint[] }) {
  const [device, setDevice] = useState<DeviceFilter>("all");

  const filtered = useMemo(
    () => (device === "all" ? points : points.filter((p) => (p.device || "unknown") === device)),
    [points, device],
  );

  const byRegion = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; count: number; devices: Record<string, number> }>();
    for (const p of filtered) {
      const c = matchRegion(p.region);
      if (!c) continue;
      const key = p.region!;
      const cur = m.get(key) || { lat: c.lat, lng: c.lng, count: 0, devices: {} };
      cur.count += p.count;
      const d = p.device || "unknown";
      cur.devices[d] = (cur.devices[d] || 0) + p.count;
      m.set(key, cur);
    }
    return [...m.entries()].map(([region, v]) => ({ region, ...v }));
  }, [filtered]);

  const max = Math.max(1, ...byRegion.map((r) => r.count));
  const heatData = useMemo<Array<[number, number, number]>>(
    () => byRegion.map((r) => [r.lat, r.lng, r.count / max]),
    [byRegion, max],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0, bot: 0, unknown: 0 };
    for (const p of points) c[p.device || "unknown"] = (c[p.device || "unknown"] || 0) + p.count;
    return c;
  }, [points]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "mobile", "desktop", "tablet", "bot"] as DeviceFilter[]).map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              device === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {d === "all" ? `All (${total})` : `${d} (${counts[d] || 0})`}
          </button>
        ))}
      </div>

      <div className="h-[480px] w-full overflow-hidden rounded-xl border border-border">
        <MapContainer center={[PH.lat, PH.lng]} zoom={PH.zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayer data={heatData} />
          {byRegion.map((r) => {
            const radius = 8 + Math.sqrt(r.count / max) * 22;
            const topDevice = Object.entries(r.devices).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
            return (
              <CircleMarker
                key={r.region}
                center={[r.lat, r.lng]}
                radius={radius}
                pathOptions={{
                  color: DEVICE_COLOR[topDevice] || DEVICE_COLOR.unknown,
                  fillColor: DEVICE_COLOR[topDevice] || DEVICE_COLOR.unknown,
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold">{r.region}</div>
                    <div>{r.count.toLocaleString()} interactions</div>
                    <div className="opacity-70">
                      {Object.entries(r.devices)
                        .sort((a, b) => b[1] - a[1])
                        .map(([d, n]) => `${d}: ${n}`)
                        .join(" · ")}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Heat intensity = total interactions per region.</span>
        {Object.entries(DEVICE_COLOR).map(([d, c]) => (
          <span key={d} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {d}
          </span>
        ))}
      </div>
    </div>
  );
}
