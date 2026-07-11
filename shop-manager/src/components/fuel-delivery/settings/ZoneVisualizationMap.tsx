import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPin } from 'lucide-react';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { cn } from '@/lib/utils';
import { DeliveryZone } from '@/hooks/fuel-delivery/useDeliveryZones';
import { FuelDeliveryYard } from '@/hooks/fuel-delivery/useFuelDeliveryYards';
import { BusinessLocation } from '@/hooks/fuel-delivery/useBusinessLocation';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import * as turf from '@turf/turf';

interface ZoneVisualizationMapProps {
  businessLocation?: BusinessLocation | null;
  yards: FuelDeliveryYard[];
  zones: DeliveryZone[];
  onZoneClick?: (zone: DeliveryZone) => void;
  onYardClick?: (yard: FuelDeliveryYard) => void;
  className?: string;
  height?: string;
}

// Predefined zone colors
const ZONE_COLORS = [
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export function ZoneVisualizationMap({
  businessLocation,
  yards,
  zones,
  onZoneClick,
  onYardClick,
  className,
  height = '400px',
}: ZoneVisualizationMapProps) {
  const { token, isLoading: isLoadingToken } = useMapboxPublicToken();
  const { getTurfDistanceUnit } = useFuelUnits();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Calculate center from business location or yards
  const center = useMemo((): [number, number] => {
    if (businessLocation?.business_longitude && businessLocation?.business_latitude) {
      return [businessLocation.business_longitude, businessLocation.business_latitude];
    }
    
    const primaryYard = yards.find(y => y.is_primary);
    if (primaryYard?.longitude && primaryYard?.latitude) {
      return [primaryYard.longitude, primaryYard.latitude];
    }
    
    if (yards.length > 0 && yards[0].longitude && yards[0].latitude) {
      return [yards[0].longitude, yards[0].latitude];
    }
    
    return [-98.5795, 39.8283]; // Center of US
  }, [businessLocation, yards]);

  // Get origin coordinates for a zone
  const getZoneOrigin = (zone: DeliveryZone): [number, number] | null => {
    // First check if zone has its own center coordinates
    if (zone.center_latitude && zone.center_longitude) {
      return [zone.center_longitude, zone.center_latitude];
    }
    
    // Check origin type
    const originType = (zone as any).origin_type || 'business';
    const originId = (zone as any).origin_id;
    
    if (originType === 'yard' && originId) {
      const yard = yards.find(y => y.id === originId);
      if (yard?.longitude && yard?.latitude) {
        return [yard.longitude, yard.latitude];
      }
    }
    
    // Default to business location
    if (businessLocation?.business_longitude && businessLocation?.business_latitude) {
      return [businessLocation.business_longitude, businessLocation.business_latitude];
    }
    
    return null;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    const hasLocation = businessLocation?.business_latitude || yards.some(y => y.latitude);
    const defaultZoom = hasLocation ? 10 : 4;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: defaultZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update map when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Remove existing zone layers
    zones.forEach((_, idx) => {
      const sourceId = `zone-${idx}`;
      if (map.current?.getLayer(`${sourceId}-fill`)) {
        map.current.removeLayer(`${sourceId}-fill`);
      }
      if (map.current?.getLayer(`${sourceId}-outline`)) {
        map.current.removeLayer(`${sourceId}-outline`);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Add zone circles
    zones.forEach((zone, idx) => {
      const origin = getZoneOrigin(zone);
      if (!origin) return;

      // Zone distances are stored in miles, turf expects consistent units
      const maxDistance = zone.max_distance_miles || zone.min_distance_miles + 25;
      const color = (zone as any).zone_color || ZONE_COLORS[idx % ZONE_COLORS.length];

      // Create outer circle (max distance) - always use miles since that's how data is stored
      const outerCircle = turf.circle(origin, maxDistance, { units: 'miles', steps: 64 });
      
      const sourceId = `zone-${idx}`;

      if (!map.current?.getSource(sourceId)) {
        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: outerCircle as any,
        });

        map.current?.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': zone.is_active ? 0.2 : 0.05,
          },
        });

        map.current?.addLayer({
          id: `${sourceId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 2,
            'line-opacity': zone.is_active ? 0.8 : 0.3,
          },
        });

        // Add click handler for zone
        if (onZoneClick) {
          map.current?.on('click', `${sourceId}-fill`, () => {
            onZoneClick(zone);
          });
          map.current?.on('mouseenter', `${sourceId}-fill`, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current?.on('mouseleave', `${sourceId}-fill`, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        }
      }
    });

    // Add business location marker
    if (businessLocation?.business_longitude && businessLocation?.business_latitude) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
              <path d="M9 9v.01"/>
              <path d="M9 12v.01"/>
              <path d="M9 15v.01"/>
              <path d="M9 18v.01"/>
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold bg-background/95 px-2 py-0.5 rounded shadow">
            Business HQ
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([businessLocation.business_longitude, businessLocation.business_latitude])
        .addTo(map.current);

      markersRef.current.push(marker);
    }

    // Add yard markers
    yards.forEach((yard) => {
      if (!yard.longitude || !yard.latitude) return;

      const el = document.createElement('div');
      el.innerHTML = `
        <div class="relative cursor-pointer group">
          <div class="w-8 h-8 ${yard.is_primary ? 'bg-blue-500' : 'bg-slate-600'} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
              <path d="M14 17h1"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-background/95 px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">
            ${yard.name}${yard.is_primary ? ' (Primary)' : ''}
          </div>
        </div>
      `;

      el.onclick = () => onYardClick?.(yard);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([yard.longitude, yard.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers and zones
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    if (businessLocation?.business_longitude && businessLocation?.business_latitude) {
      bounds.extend([businessLocation.business_longitude, businessLocation.business_latitude]);
      hasPoints = true;
    }

    yards.forEach(yard => {
      if (yard.longitude && yard.latitude) {
        bounds.extend([yard.longitude, yard.latitude]);
        hasPoints = true;
      }
    });

    if (hasPoints && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 12 });
    }
  }, [mapLoaded, businessLocation, yards, zones, onZoneClick, onYardClick]);

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
      <div ref={mapContainer} style={{ height }} className="w-full" />
      
      {/* Legend */}
      {(zones.length > 0 || yards.length > 0) && (
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs max-w-xs">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1.5">
            {businessLocation?.business_latitude && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full" />
                <span>Business HQ</span>
              </div>
            )}
            {yards.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full" />
                <span>Yard Locations</span>
              </div>
            )}
            {zones.slice(0, 4).map((zone, idx) => (
              <div key={zone.id || idx} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border-2" 
                  style={{ 
                    backgroundColor: `${(zone as any).zone_color || ZONE_COLORS[idx % ZONE_COLORS.length]}33`,
                    borderColor: (zone as any).zone_color || ZONE_COLORS[idx % ZONE_COLORS.length],
                  }} 
                />
                <span className="truncate">{zone.name}</span>
              </div>
            ))}
            {zones.length > 4 && (
              <div className="text-muted-foreground">+{zones.length - 4} more zones</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
