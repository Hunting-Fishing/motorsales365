import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressSuggestion {
  display_name: string;
  address: { house_number?: string; road?: string; city?: string; town?: string; village?: string; state?: string; postcode?: string; };
}

interface Props {
  value: string;
  onChange: (street: string, city: string, state: string, zip: string) => void;
  onRawChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

const WeldingAddressAutocomplete = ({ value, onChange, onRawChange, placeholder = "Start typing an address...", className = "", hasError = false }: Props) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us,ca&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      setSuggestions(data || []);
      setShowDropdown(data.length > 0);
    } catch { setSuggestions([]); } finally { setLoading(false); }
  }, []);

  const handleInputChange = (val: string) => {
    onRawChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const selectSuggestion = (s: AddressSuggestion) => {
    const addr = s.address;
    onChange([addr.house_number, addr.road].filter(Boolean).join(" "), addr.city || addr.town || addr.village || "", addr.state || "", addr.postcode || "");
    setShowDropdown(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder={placeholder} value={value} onChange={(e) => handleInputChange(e.target.value)} onFocus={() => suggestions.length > 0 && setShowDropdown(true)} className={`pl-9 ${hasError ? "border-destructive ring-destructive/20" : ""}`} />
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loading && <div className="p-2 text-xs text-muted-foreground">Searching...</div>}
          {suggestions.map((s, i) => (
            <button key={i} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0" onClick={() => selectSuggestion(s)}>
              <div className="flex items-start gap-2"><MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /><span className="line-clamp-2">{s.display_name}</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeldingAddressAutocomplete;
