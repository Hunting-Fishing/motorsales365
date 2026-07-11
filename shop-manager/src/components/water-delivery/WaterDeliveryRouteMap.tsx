import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Navigation, Clock, Route, MapPin, AlertTriangle, Droplets, LocateFixed, Building2, Globe } from 'lucide-react';
import { useRouteOptimization, Location, RouteOptimizationResult } from '@/hooks/useMapbox';
import { cn } from '@/lib/utils';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { validateMapboxPublicToken } from '@/lib/mapbox/validateMapboxPublicToken';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { useMapDefaultCenter } from '@/hooks/useMapDefaultCenter';

interface WaterDeliveryRouteMapProps {
  origin?: [number, number];
  destinations: Location[];
  onOptimizedRoute?: (result: RouteOptimizationResult) => void;
  className?: string;
  showOptimizeButton?: boolean;
  autoOptimize?: boolean;
  height?: string;
  shopId?: string;
}

export function WaterDeliveryRouteMap({
  origin,
  destinations,
  onOptimizedRoute,
  className,
  showOptimizeButton = true,
  autoOptimize = false,
  height = '400px',
  shopId,
}: WaterDeliveryRouteMapProps) {
  const { token, setToken, isLoading: tokenLoading } = useMapboxPublicToken();
  const [tokenInput, setTokenInput] = useState(token);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const { formatDistance } = useWaterUnits();
  
  // Smart map centering - prioritizes driver location, then shop, then US center
  // Use 'water' moduleType to fetch from water_delivery_settings table
  const { 
    center: smartCenter, 
    source: centerSource, 
    requestDriverLocation,
    usingDriverLocation,
    sourceLabel,
    isLoading: centerLoading,
  } = useMapDefaultCenter({ shopId, enableDriverLocation: true, moduleType: 'water' });

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<RouteOptimizationResult | null>(null);

  const routeOptimization = useRouteOptimization();

  // Use provided origin, or fall back to smart center
  const defaultOrigin: [number, number] = origin || smartCenter;

  useEffect(() => {
    setTokenInput(token);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!mapContainer.current || !token) return;

      setMapLoaded(false);
      setTokenError(null);

      const validation = await validateMapboxPublicToken({ token, styleId: 'mapbox/streets-v12' });
      if (cancelled) return;

      if (!validation.ok) {
        setTokenError(validation.message || 'Invalid Mapbox token.');
        return;
      }

      mapboxgl.accessToken = token;

      const instance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultOrigin,
        zoom: destinations.length > 0 ? 10 : 4,
        pitch: 30,
      });

      map.current = instance;

      instance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      instance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      instance.on('load', () => {
        setMapLoaded(true);
      });

      instance.on('error', (e) => {
        const err: any = (e as any)?.error;
        if (!err) return;
        const msg = (err?.message || String(err) || '').toLowerCase();
        if (err?.status === 401 || err?.status === 403 || msg.includes('invalid token') || msg.includes('not authorized')) {
          setTokenError(
            'Mapbox rejected this token. Verify it is a public token (pk.*) and that any URL restrictions allow this domain.'
          );
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update map center when smartCenter changes (e.g., when business location loads)
  useEffect(() => {
    if (!map.current || !mapLoaded || centerLoading) return;
    
    // Only recenter if we have a shop location and no destinations/origin to show
    if (centerSource === 'shop' && !origin && destinations.length === 0) {
      map.current.flyTo({
        center: smartCenter,
        zoom: 10,
        duration: 1500,
      });
    }
  }, [smartCenter, centerSource, mapLoaded, centerLoading, origin, destinations.length]);

  // Update markers when destinations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Determine which location to use for business marker
    // Use origin if provided, otherwise use smartCenter when it's from shop location
    const businessLocation = origin || (centerSource === 'shop' ? smartCenter : null);

    // Add business location marker
    if (businessLocation) {
      const originEl = document.createElement('div');
      originEl.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 border-3 border-white ring-4 ring-cyan-200/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
            <path d="M10 6h4"/>
            <path d="M10 10h4"/>
            <path d="M10 14h4"/>
            <path d="M10 18h4"/>
          </svg>
        </div>
      `;

      const originMarker = new mapboxgl.Marker(originEl)
        .setLngLat(businessLocation)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong class="text-cyan-600">🏢 Business Location</strong>
            <p class="text-xs text-gray-500 mt-1">Your delivery hub</p>
          </div>
        `))
        .addTo(map.current);

      markersRef.current.push(originMarker);
    }

    // Add destination markers (delivery stops)
    const displayOrder = optimizedResult?.optimizedOrder || destinations;

    displayOrder.forEach((dest, index) => {
      const el = document.createElement('div');
      const priorityColor =
        dest.priority === 'high'
          ? 'from-red-500 to-rose-600'
          : dest.priority === 'low'
            ? 'from-slate-400 to-slate-500'
            : 'from-cyan-500 to-blue-600';

      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br ${priorityColor} flex items-center justify-center shadow-lg border-2 border-white text-white font-bold text-sm">
            ${index + 1}
          </div>
          ${dest.priority === 'high' ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>' : ''}
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat(dest.coordinates)
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <strong class="text-cyan-600">💧 ${dest.name || `Stop ${index + 1}`}</strong>
              <p class="text-sm text-gray-600 mt-1">${dest.address}</p>
              ${dest.priority === 'high' ? '<span class="text-xs text-red-500 font-medium">⚠️ Priority Delivery</span>' : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (destinations.length > 0 || origin) {
      const bounds = new mapboxgl.LngLatBounds();
      if (origin) bounds.extend(origin);
      destinations.forEach((dest) => bounds.extend(dest.coordinates));

      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 14,
      });
    }
  }, [destinations, mapLoaded, optimizedResult, origin, smartCenter, centerSource]);

  // Draw route line
  useEffect(() => {
    if (!map.current || !mapLoaded || !optimizedResult?.optimizedRoute?.geometry) return;

    const sourceId = 'optimized-route';
    const layerId = 'optimized-route-line';

    // Remove existing route
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add new route
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: optimizedResult.optimizedRoute.geometry as GeoJSON.Geometry,
      },
    });
    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0891b2', // cyan-600
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });
  }, [optimizedResult, mapLoaded]);

  // Auto-optimize on mount if enabled
  useEffect(() => {
    if (autoOptimize && origin && destinations.length > 0 && !optimizedResult) {
      handleOptimize();
    }
  }, [autoOptimize, origin, destinations]);

  const handleOptimize = async () => {
    if (!origin || destinations.length === 0) return;

    try {
      const result = await routeOptimization.mutateAsync({
        origin,
        destinations,
        returnToOrigin: true,
      });

      setOptimizedResult(result);
      onOptimizedRoute?.(result);
    } catch (error) {
      console.error('Route optimization failed:', error);
    }
  };

  const saveToken = () => {
    const next = tokenInput.trim();
    setToken(next);
    setTokenError(null);
  };

  if (tokenLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(!token || tokenError) && (
        <Card className="border-cyan-200 bg-cyan-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-cyan-900">Mapbox public token required</p>
                <p className="text-xs text-cyan-700 mt-0.5">
                  Add a valid Mapbox token to enable route mapping.
                  {' '}
                  <a className="underline" href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer">
                    Get a token
                  </a>
                  .
                </p>
                {tokenError && <p className="text-xs text-red-600 mt-1">{tokenError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapbox-water-token">Mapbox public token</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="mapbox-water-token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="pk.eyJ..."
                  autoComplete="off"
                />
                <Button type="button" onClick={saveToken} className="sm:w-28 bg-cyan-600 hover:bg-cyan-700">
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="relative w-full" style={{ height }}>
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Location Source Indicator */}
          {token && !tokenError && mapLoaded && (
            <div className="absolute top-3 left-3 z-10">
              <Badge 
                variant="secondary" 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium shadow-md",
                  centerSource === 'driver' && "bg-blue-100 text-blue-700 border-blue-200",
                  centerSource === 'shop' && "bg-cyan-100 text-cyan-700 border-cyan-200",
                  centerSource === 'fallback' && "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {centerSource === 'driver' && <LocateFixed className="h-3 w-3" />}
                {centerSource === 'shop' && <Building2 className="h-3 w-3" />}
                {centerSource === 'fallback' && <Globe className="h-3 w-3" />}
                {sourceLabel}
              </Badge>
            </div>
          )}
          
          {/* My Location Button */}
          {token && !tokenError && mapLoaded && !usingDriverLocation && (
            <div className="absolute bottom-3 left-3 z-10">
              <Button
                size="sm"
                variant="secondary"
                onClick={requestDriverLocation}
                disabled={centerLoading}
                className="shadow-md bg-white/90 hover:bg-white"
              >
                <LocateFixed className="h-4 w-4 mr-1.5" />
                My Location
              </Button>
            </div>
          )}
          
          {!token && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center bg-muted/50">
              <div className="text-center">
                <Droplets className="h-12 w-12 mx-auto mb-3 text-cyan-400 opacity-50" />
                <p>Enter a Mapbox token above to load the map.</p>
              </div>
            </div>
          )}
          {tokenError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center bg-muted/50">
              Map failed to load. Please update the token above.
            </div>
          )}
        </div>
      </Card>

      {/* Controls & Stats */}
      <div className="flex flex-wrap gap-3">
        {showOptimizeButton && origin && destinations.length > 1 && (
          <Button
            onClick={handleOptimize}
            disabled={routeOptimization.isPending}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            {routeOptimization.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Route className="h-4 w-4 mr-2" />
                Optimize Route
              </>
            )}
          </Button>
        )}

        {optimizedResult && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 border-cyan-200 bg-cyan-50">
              <Navigation className="h-3.5 w-3.5 text-cyan-600" />
              {optimizedResult.optimizedRoute.distanceMiles} mi
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 border-cyan-200 bg-cyan-50">
              <Clock className="h-3.5 w-3.5 text-cyan-600" />
              {optimizedResult.optimizedRoute.durationMinutes} min
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 border-cyan-200 bg-cyan-50">
              <MapPin className="h-3.5 w-3.5 text-cyan-600" />
              {destinations.length} stops
            </Badge>
          </div>
        )}
      </div>

      {/* Route Details */}
      {optimizedResult?.legs && optimizedResult.legs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Route className="h-4 w-4 text-cyan-600" />
              Optimized Delivery Route
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {optimizedResult.legs.map((leg, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-cyan-50/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="truncate max-w-[200px]">{leg.to}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{leg.distanceMiles} mi</span>
                    <span>{leg.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
