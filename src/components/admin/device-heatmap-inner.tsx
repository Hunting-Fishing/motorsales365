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

const GRADIENT_A = { 0.2: "#fde047", 0.5: "#f97316", 0.8: "#ef4444", 1.0: "#b91c1c" };
const GRADIENT_B = { 0.2: "#bae6fd", 0.5: "#38bdf8", 0.8: "#2563eb", 1.0: "#1e3a8a" };

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

function HeatLayer({
  data,
  gradient,
}: {
  data: Array<[number, number, number]>;
  gradient: Record<number, string>;
}) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!data.length) return;
    const layer = (L as any)
      .heatLayer(data, { radius: 38, blur: 28, maxZoom: 10, minOpacity: 0.35, gradient })
      .addTo(map);
    layerRef.current = layer;
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [data, gradient, map]);
  return null;
}

type RegionAgg = {
  region: string;
  lat: number;
  lng: number;
  count: number;
  devices: Record<string, number>;
};

function aggregate(points: HeatPoint[], device: DeviceFilter): RegionAgg[] {
  const filtered =
    device === "all" ? points : points.filter((p) => (p.device || "unknown") === device);
  const m = new Map<string, RegionAgg>();
  for (const p of filtered) {
    const c = matchRegion(p.region);
    if (!c) continue;
    const key = p.region!;
    const cur = m.get(key) || { region: key, lat: c.lat, lng: c.lng, count: 0, devices: {} };
    cur.count += p.count;
    const d = p.device || "unknown";
    cur.devices[d] = (cur.devices[d] || 0) + p.count;
    m.set(key, cur);
  }
  return [...m.values()];
}

export function DeviceHeatmapInner({
  points,
  pointsB,
  labelA = "Current",
  labelB = "Previous",
}: {
  points: HeatPoint[];
  pointsB?: HeatPoint[] | null;
  labelA?: string;
  labelB?: string;
}) {
  const [device, setDevice] = useState<DeviceFilter>("all");
  const compare = !!pointsB;

  const aggA = useMemo(() => aggregate(points, device), [points, device]);
  const aggB = useMemo(() => (pointsB ? aggregate(pointsB, device) : []), [pointsB, device]);

  const maxA = Math.max(1, ...aggA.map((r) => r.count));
  const maxB = Math.max(1, ...aggB.map((r) => r.count));
  const heatA = useMemo<Array<[number, number, number]>>(
    () => aggA.map((r) => [r.lat, r.lng, r.count / maxA]),
    [aggA, maxA],
  );
  const heatB = useMemo<Array<[number, number, number]>>(
    () => aggB.map((r) => [r.lat, r.lng, r.count / maxB]),
    [aggB, maxB],
  );

  const totalA = aggA.reduce((s, r) => s + r.count, 0);
  const totalB = aggB.reduce((s, r) => s + r.count, 0);
  const delta = totalA - totalB;
  const deltaPct = totalB > 0 ? Math.round((delta / totalB) * 100) : null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0, bot: 0, unknown: 0 };
    for (const p of points) c[p.device || "unknown"] = (c[p.device || "unknown"] || 0) + p.count;
    return c;
  }, [points]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // For per-region tooltip in compare mode, build map by region
  const bByRegion = useMemo(() => {
    const m = new Map<string, RegionAgg>();
    for (const r of aggB) m.set(r.region, r);
    return m;
  }, [aggB]);

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

      {compare && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#ef4444" }}
            />
            <strong>{labelA}:</strong> {totalA.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#2563eb" }}
            />
            <strong>{labelB}:</strong> {totalB.toLocaleString()}
          </span>
          <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString()}
            {deltaPct !== null && ` (${deltaPct >= 0 ? "+" : ""}${deltaPct}%)`}
          </span>
        </div>
      )}

      <div className="h-[480px] w-full overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[PH.lat, PH.lng]}
          zoom={PH.zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {compare && <HeatLayer data={heatB} gradient={GRADIENT_B} />}
          <HeatLayer
            data={heatA}
            gradient={
              compare
                ? GRADIENT_A
                : { 0.2: "#2563eb", 0.4: "#22c55e", 0.6: "#eab308", 0.8: "#f97316", 1.0: "#ef4444" }
            }
          />
          {aggA.map((r) => {
            const radius = 8 + Math.sqrt(r.count / maxA) * 22;
            const topDevice =
              Object.entries(r.devices).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
            const b = bByRegion.get(r.region);
            const rDelta = b ? r.count - b.count : null;
            return (
              <CircleMarker
                key={`a-${r.region}`}
                center={[r.lat, compare ? r.lng - 0.15 : r.lng]}
                radius={radius}
                pathOptions={{
                  color: compare ? "#ef4444" : DEVICE_COLOR[topDevice] || DEVICE_COLOR.unknown,
                  fillColor: compare ? "#ef4444" : DEVICE_COLOR[topDevice] || DEVICE_COLOR.unknown,
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold">{r.region}</div>
                    <div>
                      <span className="text-red-600">●</span> {labelA}: {r.count.toLocaleString()}
                    </div>
                    {compare && (
                      <div>
                        <span className="text-blue-600">●</span> {labelB}:{" "}
                        {(b?.count ?? 0).toLocaleString()}
                      </div>
                    )}
                    {rDelta !== null && (
                      <div className={rDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                        Δ {rDelta >= 0 ? "+" : ""}
                        {rDelta.toLocaleString()}
                      </div>
                    )}
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
          {compare &&
            aggB.map((r) => {
              const radius = 8 + Math.sqrt(r.count / maxB) * 22;
              return (
                <CircleMarker
                  key={`b-${r.region}`}
                  center={[r.lat, r.lng + 0.15]}
                  radius={radius}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#2563eb",
                    fillOpacity: 0.3,
                    weight: 2,
                    dashArray: "4 3",
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold">{r.region}</div>
                      <div>
                        <span className="text-blue-600">●</span> {labelB}:{" "}
                        {r.count.toLocaleString()}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {compare ? (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#ef4444" }}
              />{" "}
              {labelA} (solid, left)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#2563eb" }}
              />{" "}
              {labelB} (dashed, right)
            </span>
          </>
        ) : (
          <>
            <span>Heat intensity = total interactions per region.</span>
            {Object.entries(DEVICE_COLOR).map(([d, c]) => (
              <span key={d} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{" "}
                {d}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
