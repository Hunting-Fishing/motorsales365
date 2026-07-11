import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Home, Droplets, Container, Loader2 } from 'lucide-react';

interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  locationType: 'residence' | 'cistern' | 'well' | '';
}

const MARKER_COLORS = {
  residence: '#22c55e', // green
  cistern: '#3b82f6',   // blue
  well: '#06b6d4',      // cyan
  '': '#ef4444',        // red (default)
};

export function LocationMapPicker({
  latitude,
  longitude,
  onLocationChange,
  locationType,
}: LocationMapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { token, setToken, isLoading } = useMapboxPublicToken();
  const [tempToken, setTempToken] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    const initialCenter: [number, lng: number] = [
      longitude || -66.1,  // Puerto Rico default
      latitude || 18.4,
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialCenter[0], initialCenter[1]],
      zoom: latitude && longitude ? 15 : 9,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapReady(true);
    });

    // Click to place marker
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      onLocationChange(lat, lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
      setMapReady(false);
    };
  }, [token]);

  // Update marker when coordinates change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    if (latitude && longitude) {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${MARKER_COLORS[locationType] || MARKER_COLORS['']};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `;

      marker.current = new mapboxgl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          onLocationChange(lngLat.lat, lngLat.lng);
        }
      });

      // Center map on marker
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 500,
      });
    }
  }, [latitude, longitude, locationType, mapReady, onLocationChange]);

  const getLocationIcon = () => {
    switch (locationType) {
      case 'residence':
        return <Home className="h-4 w-4 text-green-600" />;
      case 'cistern':
        return <Container className="h-4 w-4 text-blue-600" />;
      case 'well':
        return <Droplets className="h-4 w-4 text-cyan-600" />;
      default:
        return <MapPin className="h-4 w-4 text-red-600" />;
    }
  };

  // No token - show input to enter one
  if (!token && !isLoading) {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Enter your Mapbox public token to enable the map. Get one free at{' '}
          <a 
            href="https://mapbox.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            mapbox.com
          </a>
        </p>
        <div className="flex gap-2">
          <Input
            value={tempToken}
            onChange={(e) => setTempToken(e.target.value)}
            placeholder="pk.ey..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setToken(tempToken)}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
          >
            Save
          </button>
        </div>
        
        {/* Show coordinates input as fallback */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={latitude || ''}
              onChange={(e) => onLocationChange(parseFloat(e.target.value) || 0, longitude || 0)}
              placeholder="18.4655"
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={longitude || ''}
              onChange={(e) => onLocationChange(latitude || 0, parseFloat(e.target.value) || 0)}
              placeholder="-66.1057"
            />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div 
          ref={mapContainer} 
          className="h-[200px] rounded-lg border overflow-hidden"
        />
        
        {/* Instructions overlay */}
        <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
          {getLocationIcon()}
          <span>Click on map to mark {locationType || 'location'}</span>
          {latitude && longitude && (
            <span className="ml-auto text-foreground font-medium">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          )}
        </div>
      </div>
      
      {/* Manual coordinate input */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Enter coordinates manually
        </summary>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={latitude || ''}
              onChange={(e) => onLocationChange(parseFloat(e.target.value) || 0, longitude || 0)}
              placeholder="18.4655"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={longitude || ''}
              onChange={(e) => onLocationChange(latitude || 0, parseFloat(e.target.value) || 0)}
              placeholder="-66.1057"
              className="h-8"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
