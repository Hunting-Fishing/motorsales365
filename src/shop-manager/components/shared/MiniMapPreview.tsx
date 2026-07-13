import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { MapPin, Loader2 } from 'lucide-react';

interface MiniMapPreviewProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (lat: number, lng: number) => void;
  className?: string;
  draggable?: boolean;
}

export function MiniMapPreview({
  latitude,
  longitude,
  onLocationChange,
  className = '',
  draggable = true,
}: MiniMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { token, isLoading } = useMapboxPublicToken();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
      interactive: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Create draggable marker
    marker.current = new mapboxgl.Marker({
      color: '#0891b2', // cyan-600
      draggable: draggable,
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    if (draggable && onLocationChange) {
      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          onLocationChange(lngLat.lat, lngLat.lng);
        }
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [token]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([longitude, latitude]);
      map.current.flyTo({
        center: [longitude, latitude],
        duration: 500,
      });
    }
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} style={{ height: '200px' }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted rounded-lg gap-2 ${className}`} style={{ height: '200px' }}>
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Map preview unavailable</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '200px' }} />
      {draggable && mapLoaded && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded shadow">
          Drag pin to adjust location
        </div>
      )}
    </div>
  );
}
