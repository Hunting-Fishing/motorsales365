import { useState } from "react";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PlacesAutocomplete } from "./places-autocomplete";

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
        onChangeCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My location",
        });
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

  const chipBase =
    "snap-start shrink-0 inline-flex items-center justify-center rounded-full border font-medium transition active:scale-[0.97] " +
    "min-h-11 px-4 py-2.5 text-sm sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-xs";
  const chipActive = "border-primary bg-primary text-primary-foreground shadow-sm";
  const chipIdle = "border-border bg-card hover:bg-secondary";

  return (
    <div className="space-y-3">
      {/* Type chips — swipeable strip on mobile, wraps on sm+ */}
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:overflow-visible">
        <button
          type="button"
          aria-pressed={selectedType === null}
          onClick={() => onSelectType(null)}
          className={`${chipBase} ${selectedType === null ? chipActive : chipIdle}`}
        >
          All types
        </button>
        {types.map((t) => (
          <button
            key={t.slug}
            type="button"
            aria-pressed={selectedType === t.slug}
            onClick={() => onSelectType(selectedType === t.slug ? null : t.slug)}
            className={`${chipBase} ${selectedType === t.slug ? chipActive : chipIdle}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + locate — stacked full-width on mobile, inline on sm+ */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <PlacesAutocomplete
          value={search}
          onChange={setSearch}
          onPick={(p) => {
            onChangeCenter({ lat: p.lat, lng: p.lng, label: p.label });
            if (!radiusKm) onChangeRadius(10);
          }}
        />
        <Button
          variant="outline"
          onClick={useMyLocation}
          disabled={locating}
          className="h-11 w-full justify-center text-base sm:h-9 sm:w-auto sm:text-sm"
        >
          <Crosshair className="mr-1.5 h-5 w-5 sm:h-4 sm:w-4" />
          {locating ? "Locating…" : "Use my location"}
        </Button>
      </div>

      {center && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground sm:text-xs">
              Centered on {center.label ?? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}
            </span>
            <button
              type="button"
              aria-label="Clear location"
              onClick={() => {
                onChangeCenter(null);
                onChangeRadius(null);
              }}
              className="-mr-1 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-7 sm:w-7"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Radius</span>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible sm:flex-wrap">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  type="button"
                  aria-pressed={radiusKm === km}
                  onClick={() => onChangeRadius(km)}
                  className={`snap-start shrink-0 inline-flex items-center justify-center rounded-full border min-h-10 min-w-14 px-3 text-sm font-medium transition active:scale-[0.97] sm:min-h-7 sm:min-w-0 sm:px-2 sm:py-0.5 sm:text-[11px] ${
                    radiusKm === km ? chipActive : chipIdle
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
