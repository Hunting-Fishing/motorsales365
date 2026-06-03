import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export type PlacePick = { lat: number; lng: number; label: string };

type GeoSearchResult = {
  id: string;
  primary: string;
  secondary: string;
  lat: number;
  lng: number;
  label: string;
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
    { id: string; primary: string; secondary: string; lat: number; lng: number; label: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      if (!input.trim() || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", input);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "7");
        url.searchParams.set("countrycodes", "ph");
        url.searchParams.set("viewbox", PH_VIEWBOX);
        url.searchParams.set("bounded", "1");
        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Geocoder error");
        const data = (await res.json()) as NominatimResult[];
        const mapped = data.map((r) => {
          const parts = r.display_name.split(", ");
          const primary = r.name || parts[0] || r.display_name;
          const secondary = parts.slice(primary === parts[0] ? 1 : 0).join(", ");
          return {
            id: String(r.place_id),
            primary,
            secondary,
            lat: Number(r.lat),
            lng: Number(r.lon),
            label: r.display_name,
          };
        });
        setSuggestions(mapped);
        setOpen(true);
        setHighlight(0);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") setSuggestions([]);
      }
    },
    [],
  );

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // Respect Nominatim usage policy: ~1 req/sec, debounce generously
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 350);
  };

  const handlePick = (s: (typeof suggestions)[number]) => {
    setOpen(false);
    onChange(s.secondary ? `${s.primary}, ${s.secondary}` : s.primary);
    onPick({ lat: s.lat, lng: s.lng, label: s.label });
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
              key={s.id}
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
