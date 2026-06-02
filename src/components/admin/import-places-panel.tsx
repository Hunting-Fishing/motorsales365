import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, Search, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { findNearbyForImport, importPlaces, type NearbyImportRow } from "@/lib/places.functions";

const TYPE_OPTIONS = [
  { slug: "fuel_station", label: "Gas station" },
  { slug: "dealership", label: "Car dealership" },
  { slug: "repair_shop", label: "Repair shop" },
  { slug: "body_paint", label: "Body & paint" },
  { slug: "parts_accessories", label: "Parts & accessories" },
  { slug: "tire_shop", label: "Tire shop" },
  { slug: "motorcycle_shop", label: "Motorcycle shop" },
  { slug: "carwash", label: "Carwash" },
  { slug: "insurance", label: "Insurance" },
];

const RADIUS_M_OPTIONS = [1000, 2500, 5000, 10000, 25000, 50000];

export function ImportPlacesPanel() {
  const findFn = useServerFn(findNearbyForImport);
  const importFn = useServerFn(importPlaces);

  const [typeSlug, setTypeSlug] = useState("fuel_station");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusM, setRadiusM] = useState(5000);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<NearbyImportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => toast.error(err.message || "Could not get your location"),
    );
  };

  const geocode = async (q: string) => {
    if (!q.trim()) return;
    try {
      const res = await fetch(`/api/public/geocode?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json?.lat) return toast.error(json?.error || "Not found");
      setLat(String(json.lat));
      setLng(String(json.lng));
      toast.success(`Centered on ${json.label}`);
    } catch {
      toast.error("Geocoding failed");
    }
  };

  const search = async () => {
    const la = parseFloat(lat),
      ln = parseFloat(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return toast.error("Enter a valid lat/lng");
    setSearching(true);
    setRows([]);
    setSelected(new Set());
    try {
      const res = await findFn({
        data: { lat: la, lng: ln, radius_m: radiusM, type_slug: typeSlug },
      });
      setRows(res.rows);
      // Pre-select all "new"
      setSelected(new Set(res.rows.filter((r) => r.status === "new").map((r) => r.place_id)));
      if (res.rows.length === 0) toast.info("No places found in this area");
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const doImport = async () => {
    const picks = rows.filter((r) => selected.has(r.place_id) && r.status === "new");
    if (picks.length === 0) return toast.error("Pick at least one new place");
    setImporting(true);
    try {
      const res = await importFn({
        data: {
          type_slug: typeSlug,
          places: picks.map((p) => ({
            place_id: p.place_id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            address: p.address,
            phone: p.phone,
            website: p.website,
          })),
        },
      });
      toast.success(`Imported ${res.inserted.length}, skipped ${res.skipped.length}`);
      // Refresh
      await search();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const toggle = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div>
          <h2 className="font-display text-lg font-bold">
            Import nearby businesses from Google Places
          </h2>
          <p className="text-xs text-muted-foreground">
            Imported businesses are saved as <span className="font-medium">pending</span> with no
            owner. Owners can claim them later.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Business type</Label>
            <select
              value={typeSlug}
              onChange={(e) => setTypeSlug(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Search radius</Label>
            <select
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {RADIUS_M_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m / 1000} km
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="14.5995"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="120.9842"
              className="h-9"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
              <Crosshair className="mr-1 h-4 w-4" /> My location
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-0">
            <Label className="text-xs">…or search a place</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Quezon City, Cebu IT Park"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    geocode((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
          </div>
          <Button onClick={search} disabled={searching}>
            <Search className="mr-1 h-4 w-4" />
            {searching ? "Searching…" : "Search nearby"}
          </Button>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {rows.length} place{rows.length === 1 ? "" : "s"} found · {selected.size} selected
            </div>
            <Button onClick={doImport} disabled={importing || selected.size === 0}>
              <Download className="mr-1 h-4 w-4" />
              {importing ? "Importing…" : `Import ${selected.size}`}
            </Button>
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const disabled = r.status !== "new";
              return (
                <div key={r.place_id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    checked={selected.has(r.place_id)}
                    onCheckedChange={() => !disabled && toggle(r.place_id)}
                    disabled={disabled}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{r.name}</span>
                      {r.status === "new" && <Badge variant="default">New</Badge>}
                      {r.status === "already_imported" && (
                        <Badge variant="secondary">Already imported</Badge>
                      )}
                      {r.status === "duplicate_name" && (
                        <Badge variant="outline">Possible duplicate</Badge>
                      )}
                      {r.rating != null && (
                        <span className="text-xs text-muted-foreground">
                          ★ {r.rating.toFixed(1)} ({r.rating_count ?? 0})
                        </span>
                      )}
                    </div>
                    {r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {r.phone && <span>{r.phone}</span>}
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span>
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
