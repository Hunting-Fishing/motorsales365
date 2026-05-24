/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "./google-maps-loader";

export type PlacePick = { lat: number; lng: number; label: string };

// Philippines bias bounds
const PH_BIAS = {
  low: { latitude: 4.5, longitude: 116.0 },
  high: { latitude: 21.5, longitude: 127.0 },
};

export function PlacesAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PlacePick) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<
    { placeId: string; primary: string; secondary: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazy-load Places library
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled) return;
        const lib = (await g.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        placesLibRef.current = lib;
        sessionRef.current = new lib.AutocompleteSessionToken();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchSuggestions = useMemo(
    () => async (input: string) => {
      const lib = placesLibRef.current;
      if (!lib || !input.trim() || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const { suggestions: out } =
          await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: sessionRef.current ?? undefined,
            includedRegionCodes: ["ph"],
            locationBias: { low: PH_BIAS.low, high: PH_BIAS.high } as any,
          });
        const mapped =
          out
            ?.map((s) => {
              const p = s.placePrediction;
              if (!p) return null;
              return {
                placeId: p.placeId,
                primary: p.mainText?.toString() ?? p.text?.toString() ?? "",
                secondary: p.secondaryText?.toString() ?? "",
              };
            })
            .filter(Boolean) as { placeId: string; primary: string; secondary: string }[];
        setSuggestions(mapped ?? []);
        setOpen(true);
        setHighlight(0);
      } catch {
        setSuggestions([]);
      }
    },
    [],
  );

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 220);
  };

  const handlePick = async (s: { placeId: string; primary: string; secondary: string }) => {
    const lib = placesLibRef.current;
    if (!lib) return;
    setOpen(false);
    const label = s.secondary ? `${s.primary}, ${s.secondary}` : s.primary;
    onChange(label);
    try {
      const place = new lib.Place({ id: s.placeId });
      await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
      const loc = place.location;
      if (loc) {
        onPick({
          lat: typeof loc.lat === "function" ? loc.lat() : (loc as any).lat,
          lng: typeof loc.lng === "function" ? loc.lng() : (loc as any).lng,
          label: place.formattedAddress ?? label,
        });
      }
      // Refresh session token after a pick
      sessionRef.current = new lib.AutocompleteSessionToken();
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-1 items-center gap-2 min-w-0">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            handlePick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder ?? "Search a city, barangay or address…"}
        className="h-9"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-6 right-0 top-10 z-50 max-h-72 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === highlight ? "bg-accent text-accent-foreground" : ""}`}
            >
              <div className="font-medium">{s.primary}</div>
              {s.secondary && <div className="text-xs text-muted-foreground">{s.secondary}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
