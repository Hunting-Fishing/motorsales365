import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Maximize2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteStop {
  id: string;
  stop_order: number;
  location_address: string;
  latitude?: number;
  longitude?: number;
  status: string;
  job?: {
    job_number: string;
    customer?: {
      company?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
}

interface OptimizedRoute {
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  duration: number;
  distance: number;
  durationMinutes: number;
  distanceMiles: number;
}

interface RouteMapViewProps {
  stops: RouteStop[];
  shopLocation?: { lat: number; lng: number; address: string };
  optimizedRoute?: OptimizedRoute | null;
  mapboxToken?: string;
  onStopClick?: (stop: RouteStop) => void;
  className?: string;
  isOptimizing?: boolean;
}

export function RouteMapView({
  stops,
  shopLocation,
  optimizedRoute,
  mapboxToken,
  onStopClick,
  className,
  isOptimizing = false
}: RouteMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter stops with valid coordinates
  const validStops = stops.filter(s => s.latitude && s.longitude);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    const defaultCenter: [number, number] = shopLocation 
      ? [shopLocation.lng, shopLocation.lat]
      : validStops[0] 
        ? [validStops[0].longitude!, validStops[0].latitude!]
        : [-124.9, 49.7]; // Default to Comox area

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 11
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update markers when stops change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add shop location marker
    if (shopLocation) {
      const shopEl = document.createElement('div');
      shopEl.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold shadow-lg border-2 border-white';
      shopEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

      const marker = new mapboxgl.Marker({ element: shopEl })
        .setLngLat([shopLocation.lng, shopLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>Shop</strong><br/>${shopLocation.address}`))
        .addTo(map.current);
      
      markersRef.current.push(marker);
    }

    // Add stop markers
    validStops.forEach((stop) => {
      const el = document.createElement('div');
      const isCompleted = stop.status === 'completed';
      const isActive = stop.status === 'in_progress' || stop.status === 'arrived';
      
      el.className = cn(
        'flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110',
        isCompleted ? 'bg-green-500 text-white' :
        isActive ? 'bg-amber-500 text-white' :
        'bg-primary text-primary-foreground'
      );
      el.textContent = String(stop.stop_order);

      const customerName = stop.job?.customer?.company || 
        `${stop.job?.customer?.first_name || ''} ${stop.job?.customer?.last_name || ''}`.trim() ||
        'Unknown';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="min-width: 150px;">
          <strong>Stop ${stop.stop_order}</strong><br/>
          <span style="color: #666;">${stop.job?.job_number || ''}</span><br/>
          ${customerName}<br/>
          <small style="color: #888;">${stop.location_address}</small>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude!, stop.latitude!])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => onStopClick?.(stop));

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (validStops.length > 0 || shopLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      
      if (shopLocation) {
        bounds.extend([shopLocation.lng, shopLocation.lat]);
      }
      
      validStops.forEach(stop => {
        bounds.extend([stop.longitude!, stop.latitude!]);
      });

      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [stops, shopLocation, validStops]);

  // Draw route line when optimized route is available
  useEffect(() => {
    if (!map.current || !optimizedRoute?.geometry) return;

    const sourceId = 'route-line';
    const layerId = 'route-line-layer';

    // Wait for map to be loaded
    const drawRoute = () => {
      // Remove existing layer and source
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      // Add route line
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: optimizedRoute.geometry as GeoJSON.Geometry
        }
      });

      map.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#6366f1',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    };

    if (map.current.isStyleLoaded()) {
      drawRoute();
    } else {
      map.current.on('style.load', drawRoute);
    }
  }, [optimizedRoute]);

  if (!mapboxToken) {
    return (
      <Card className={cn("border-border", className)}>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Map preview unavailable. Configure Mapbox token in settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Route Map
          </CardTitle>
          <div className="flex items-center gap-2">
            {isOptimizing && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Optimizing...
              </Badge>
            )}
            {optimizedRoute && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {optimizedRoute.distanceMiles.toFixed(1)} mi
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {optimizedRoute.durationMinutes} min
                </span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapContainer} 
          className={cn(
            "w-full transition-all duration-300",
            isFullscreen ? "h-[600px]" : "h-[350px]"
          )}
        />
        
        {/* Legend */}
        <div className="flex items-center gap-4 p-3 border-t border-border bg-muted/30 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Shop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-primary" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-indigo-500/80" style={{ width: '20px', height: '4px' }} />
            <span>Route</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
