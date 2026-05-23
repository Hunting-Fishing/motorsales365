import { useState } from "react";
import { Crosshair, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type CenterPoint = { lat: number; lng: number; label?: string } | null;

const RADIUS_OPTIONS = [1, 5, 10, 25, 50, 100];

export function MapFilterBar({
  types,
  selectedType,
  onSelectType,
  center,
  onChangeCenter,
  radiusKm,
  onChangeRadius,
}: {
  types: { slug: string; label: string }[];
  selectedType: string | null;
  onSelectType: (slug: string | null) => void;
  center: CenterPoint;
  onChangeCenter: (c: CenterPoint) => void;
  radiusKm: number | null;
  onChangeRadius: (km: number | null) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChangeCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" });
        if (!radiusKm) onChangeRadius(10);
        setLocating(false);
      },
      (err) => {
        toast.error(err.message || "Could not get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const geocodeSearch = async () => {
    const q = search.trim();
    if (!q) return;
    try {
      const res = await fetch(`/api/public/geocode?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json?.lat) {
        toast.error(json?.error || "Location not found");
        return;
      }
      onChangeCenter({ lat: json.lat, lng: json.lng, label: json.label ?? q });
      if (!radiusKm) onChangeRadius(10);
    } catch {
      toast.error("Geocoding failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectType(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedType === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
        >
          All types
        </button>
        {types.map((t) => (
          <button
            key={t.slug}
            onClick={() => onSelectType(selectedType === t.slug ? null : t.slug)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedType === t.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                geocodeSearch();
              }
            }}
            placeholder="Search a city, barangay or address…"
            className="h-9"
          />
          <Button size="sm" variant="outline" onClick={geocodeSearch}>Go</Button>
        </div>
        <Button size="sm" variant="outline" onClick={useMyLocation} disabled={locating}>
          <Crosshair className="mr-1 h-4 w-4" />
          {locating ? "Locating…" : "Use my location"}
        </Button>
      </div>

      {center && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">Centered on {center.label ?? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}</span>
          <span className="ml-2 text-muted-foreground">Radius:</span>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => onChangeRadius(km)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${radiusKm === km ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
            >
              {km} km
            </button>
          ))}
          <button
            onClick={() => {
              onChangeCenter(null);
              onChangeRadius(null);
            }}
            className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
