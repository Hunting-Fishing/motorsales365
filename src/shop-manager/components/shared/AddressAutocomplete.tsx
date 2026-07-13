import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddressResult {
  fullAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    province?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const parseNominatimResult = (result: NominatimResult): AddressResult => {
    const addr = result.address;
    
    // Build street address
    const streetParts = [addr.house_number, addr.road].filter(Boolean);
    const streetAddress = streetParts.join(' ') || result.display_name.split(',')[0];
    
    // Get city (Nominatim uses different fields depending on location)
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    
    // Get state/province
    const state = addr.state || addr.province || '';
    
    return {
      fullAddress: result.display_name,
      streetAddress,
      city,
      state,
      postalCode: addr.postcode || '',
      country: addr.country || '',
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  };

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    setNoResults(false);
    
    try {
      // Nominatim API - free, no token required
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=us,ca`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Address search failed');
      }

      const results: NominatimResult[] = await response.json();
      
      if (results.length > 0) {
        setSuggestions(results);
        setShowSuggestions(true);
        setNoResults(false);
      } else {
        setSuggestions([]);
        setNoResults(true);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
      setNoResults(true);
      setShowSuggestions(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 400); // Slightly longer debounce for Nominatim rate limits
  };

  const handleSelectSuggestion = (result: NominatimResult) => {
    const parsed = parseNominatimResult(result);
    onSelect(parsed);
    onChange(parsed.streetAddress);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    
    if (!showSuggestions || suggestions.length === 0) {
      // If Enter pressed with no suggestions showing, do nothing special
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        // Select the highlighted item, or the first suggestion if none selected
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectSuggestion(suggestions[0]);
        }
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Format display text for suggestion
  const formatSuggestionDisplay = (result: NominatimResult) => {
    const parts = result.display_name.split(',');
    const main = parts[0];
    const secondary = parts.slice(1, 3).join(',').trim();
    return { main, secondary };
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pl-10 pr-10', className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto"
        >
          {/* No results message */}
          {noResults && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No address matches found. Try a more specific address.
            </div>
          )}
          
          {/* Suggestions list */}
          {suggestions.map((result, index) => {
            const { main, secondary } = formatSuggestionDisplay(result);
            return (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(result)}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md',
                  index === selectedIndex && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">{main}</div>
                    {secondary && (
                      <div className="text-xs text-muted-foreground">{secondary}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
