import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Navigation, MapPin, Phone, ExternalLink, Fuel, X } from 'lucide-react';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { cn } from '@/lib/utils';

interface NavigationStop {
  id: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  customerName?: string;
  phone?: string;
  fuelType?: string;
  quantity?: number;
}

interface NavigationMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: NavigationStop | null;
  onArrived?: () => void;
}

export function NavigationMapDialog({ 
  open, 
  onOpenChange, 
  stop,
  onArrived 
}: NavigationMapDialogProps) {
  const { token, isLoading: isLoadingToken } = useMapboxPublicToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user location
  useEffect(() => {
    if (!open) return;
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude]);
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open]);

  // Initialize map
  useEffect(() => {
    if (!open || !mapContainer.current || !token || !stop) return;
    
    // If no coordinates, we can't show map
    if (!stop.latitude || !stop.longitude) return;

    mapboxgl.accessToken = token;

    const center: [number, number] = [stop.longitude, stop.latitude];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center,
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocateControl, 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Trigger geolocation automatically
      setTimeout(() => {
        geolocateControl.trigger();
      }, 500);
    });

    // Add destination marker
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg mb-1">
          Destination
        </div>
        <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `;

    marker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(center)
      .addTo(map.current);

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [open, token, stop]);

  // Draw route when we have user location
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation || !stop?.latitude || !stop?.longitude) return;

    const drawRoute = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation[0]},${userLocation[1]};${stop.longitude},${stop.latitude}?geometries=geojson&overview=full&access_token=${token}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0].geometry;

          // Remove existing route if any
          if (map.current?.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
          }

          map.current?.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route,
            },
          });

          map.current?.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });

          // Fit bounds to show entire route
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend(userLocation);
          bounds.extend([stop.longitude, stop.latitude]);
          map.current?.fitBounds(bounds, { padding: 80 });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    drawRoute();
  }, [mapLoaded, userLocation, stop, token]);

  const handleOpenExternalNav = () => {
    if (!stop?.address) return;
    
    // Try to open in native maps app first, fallback to Google Maps
    const encodedAddress = encodeURIComponent(stop.address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = `maps://maps.apple.com/?daddr=${encodedAddress}`;
    } else {
      window.open(`geo:0,0?q=${encodedAddress}`, '_blank');
    }
  };

  const handleCall = () => {
    if (stop?.phone) {
      window.location.href = `tel:${stop.phone}`;
    }
  };

  if (!stop) return null;

  const hasCoordinates = stop.latitude && stop.longitude;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Navigate to Stop
          </DialogTitle>
        </DialogHeader>

        {/* Stop Info */}
        <div className="px-4 pb-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <h3 className="font-medium">{stop.customerName || 'Delivery Stop'}</h3>
            <p className="text-sm text-muted-foreground mt-1">{stop.address || 'No address'}</p>
            <div className="flex items-center gap-3 mt-2">
              {stop.fuelType && (
                <Badge variant="secondary" className="text-xs">
                  <Fuel className="h-3 w-3 mr-1" />
                  {stop.fuelType}
                </Badge>
              )}
              {stop.quantity && (
                <span className="text-xs text-muted-foreground">{stop.quantity} gal</span>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative w-full h-[300px] bg-muted">
          {isLoadingToken || isGettingLocation ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !token ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <div>
                <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Mapbox token required for map features</p>
              </div>
            </div>
          ) : !hasCoordinates ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <div>
                <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No coordinates available for this address</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={handleOpenExternalNav}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in Maps App
                </Button>
              </div>
            </div>
          ) : (
            <div ref={mapContainer} className="absolute inset-0" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-3 border-t">
          <div className="grid grid-cols-2 gap-2">
            {stop.phone && (
              <Button variant="outline" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenExternalNav} className={cn(!stop.phone && 'col-span-2')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Maps
            </Button>
          </div>
          
          {onArrived && (
            <Button className="w-full" onClick={onArrived}>
              <MapPin className="h-4 w-4 mr-2" />
              I've Arrived
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
