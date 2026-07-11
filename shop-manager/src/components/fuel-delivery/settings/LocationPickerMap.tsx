import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { cn } from '@/lib/utils';

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  height?: string;
  className?: string;
  placeholder?: string;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

export function LocationPickerMap({
  latitude,
  longitude,
  address,
  onLocationChange,
  height = '300px',
  className,
  placeholder = 'Search for an address...',
}: LocationPickerMapProps) {
  const { token, isLoading: isLoadingToken } = useMapboxPublicToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(address || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    const defaultCenter: [number, number] = longitude && latitude 
      ? [longitude, latitude] 
      : [-98.5795, 39.8283]; // Center of US

    const defaultZoom = longitude && latitude ? 14 : 4;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: defaultZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add click handler to place marker
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      updateMarker(lng, lat);
      
      // Reverse geocode to get address
      const addr = await reverseGeocode(lng, lat);
      onLocationChange({ latitude: lat, longitude: lng, address: addr });
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add initial marker if coordinates exist
      if (longitude && latitude) {
        updateMarker(longitude, latitude);
      }
    });

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update marker position
  const updateMarker = useCallback((lng: number, lat: number) => {
    if (!map.current) return;

    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;
      
      marker.current = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker.current.on('dragend', async () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          const addr = await reverseGeocode(lngLat.lng, lngLat.lat);
          onLocationChange({ latitude: lngLat.lat, longitude: lngLat.lng, address: addr });
        }
      });
    }

    map.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
  }, [onLocationChange]);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    if (!token) return '';
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Search for addresses
  const searchAddress = useCallback(async (query: string) => {
    if (!token || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&country=US,CA&types=address,place,poi`
      );
      const data = await response.json();
      setSearchResults(data.features?.map((f: any) => ({
        id: f.id,
        place_name: f.place_name,
        center: f.center,
      })) || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [token]);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  // Handle search result selection
  const handleResultSelect = (result: SearchResult) => {
    const [lng, lat] = result.center;
    updateMarker(lng, lat);
    onLocationChange({ latitude: lat, longitude: lng, address: result.place_name });
    setSearchQuery(result.place_name);
    setShowResults(false);
  };

  if (isLoadingToken) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)} style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg p-4 text-center", className)} style={{ height }}>
        <div>
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Mapbox token required for map features</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border", className)}>
      {/* Search bar overlay */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={placeholder}
            className="pl-9 pr-9 bg-background/95 backdrop-blur-sm shadow-lg"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg shadow-lg border max-h-60 overflow-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                    <span className="line-clamp-2">{result.place_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator for search */}
      {isSearching && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Searching...</span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} style={{ height }} className="w-full" />

      {/* Instructions overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <div className="bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-xs text-muted-foreground text-center">
          Click on the map to set location, or search for an address above
        </div>
      </div>
    </div>
  );
}
