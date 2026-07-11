import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, X, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';

export interface AddressResult {
  placeName: string;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  context?: {
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const { token } = useMapboxPublicToken();

  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (query: string) => {
    if (!token) {
      setSuggestions([]);
      return;
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&limit=5&country=US,CA&types=address,place,poi`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const results: AddressResult[] = data.features.map((feature: any) => ({
          placeName: feature.place_name,
          coordinates: feature.center as [number, number],
          address: feature.place_name,
          context: feature.context?.reduce((acc: any, ctx: any) => {
            if (ctx.id.startsWith('postcode')) acc.postcode = ctx.text;
            if (ctx.id.startsWith('place')) acc.city = ctx.text;
            if (ctx.id.startsWith('region')) acc.state = ctx.text;
            if (ctx.id.startsWith('country')) acc.country = ctx.text;
            return acc;
          }, {}),
        }));
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (result: AddressResult) => {
    onChange(result.address);
    onSelect?.(result);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={token ? placeholder : 'Set Mapbox token to enable search'}
          disabled={disabled}
          className="pl-10 pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearInput}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((result, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                'w-full px-3 py-2.5 text-left flex items-start gap-3 hover:bg-accent transition-colors',
                selectedIndex === index && 'bg-accent'
              )}
              onClick={() => handleSelectSuggestion(result)}
            >
              <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{result.placeName}</p>
                {result.context && (
                  <p className="text-xs text-muted-foreground">
                    {[result.context.city, result.context.state, result.context.postcode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground flex items-center gap-1">
            <img
              src="https://docs.mapbox.com/help/demos/custom-markers-gl-js/mapbox-icon.png"
              alt="Mapbox"
              className="h-3 w-3"
            />
            Powered by Mapbox
          </div>
        </div>
      )}
    </div>
  );
}

