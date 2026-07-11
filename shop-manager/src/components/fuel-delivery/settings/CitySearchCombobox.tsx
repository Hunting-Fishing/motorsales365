import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  CANADIAN_CITIES, 
  PROVINCE_NAMES, 
  getCitiesByProvince,
  type CanadianCity 
} from '@/data/canadianCities';

interface CitySearchComboboxProps {
  value: string; // Format: "city|province"
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CitySearchCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Search cities..." 
}: CitySearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current value
  const [selectedCity, selectedProvince] = value ? value.split('|') : ['', ''];
  
  // Get display text for selected value
  const displayValue = selectedCity && selectedProvince 
    ? `${selectedCity}, ${selectedProvince}`
    : '';

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) {
      // Show all cities grouped by province when no search
      return getCitiesByProvince();
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered: Record<string, CanadianCity[]> = {};

    for (const city of CANADIAN_CITIES) {
      const matchesCity = city.city.toLowerCase().includes(lowerQuery);
      const matchesProvince = city.province.toLowerCase().includes(lowerQuery) ||
        PROVINCE_NAMES[city.province]?.toLowerCase().includes(lowerQuery);
      
      if (matchesCity || matchesProvince) {
        if (!filtered[city.province]) {
          filtered[city.province] = [];
        }
        filtered[city.province].push(city);
      }
    }

    return filtered;
  }, [searchQuery]);

  // Count total results
  const totalResults = useMemo(() => {
    return Object.values(filteredCities).reduce((sum, cities) => sum + cities.length, 0);
  }, [filteredCities]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (city: CanadianCity) => {
    onValueChange(`${city.city}|${city.province}`);
    setOpen(false);
    setSearchQuery('');
  };

  // Province order for display
  const provinceOrder = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between h-10 font-normal"
        onClick={() => setOpen(!open)}
      >
        <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
          {displayValue || placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Type to search 500+ cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              {totalResults} cities available
            </p>
          </div>
          
          {/* Results */}
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {provinceOrder.map((province) => {
                const cities = filteredCities[province];
                if (!cities || cities.length === 0) return null;
                
                return (
                  <div key={province} className="mb-2">
                    {/* Province Header */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded sticky top-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {PROVINCE_NAMES[province] || province}
                        <span className="ml-auto text-muted-foreground/70">
                          ({cities.length})
                        </span>
                      </div>
                    </div>
                    
                    {/* Cities List */}
                    {cities.map((city) => {
                      const isSelected = city.city === selectedCity && city.province === selectedProvince;
                      
                      return (
                        <button
                          key={`${city.city}-${city.province}`}
                          type="button"
                          onClick={() => handleSelect(city)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Check 
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )} 
                          />
                          <span className="truncate">{city.city}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {city.province}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              
              {totalResults === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No cities found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
