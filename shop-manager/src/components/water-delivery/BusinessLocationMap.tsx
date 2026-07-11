import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, AlertTriangle, Building2 } from 'lucide-react';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { validateMapboxPublicToken } from '@/lib/mapbox/validateMapboxPublicToken';
import { useGeocode } from '@/hooks/useMapbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AddressAutocomplete, AddressResult } from '@/components/fuel-delivery/AddressAutocomplete';

interface BusinessLocationMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  onLocationChange?: (location: { latitude: number; longitude: number; address: string }) => void;
  className?: string;
  height?: string;
  editable?: boolean;
}

export function BusinessLocationMap({
  latitude,
  longitude,
  address,
  onLocationChange,
  className,
  height = '300px',
  editable = true,
}: BusinessLocationMapProps) {
  const { token, setToken, isLoading: tokenLoading } = useMapboxPublicToken();
  const [tokenInput, setTokenInput] = useState(token);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(
    latitude && longitude
      ? { latitude, longitude, address: address || '' }
      : null
  );

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const geocodeMutation = useGeocode();

  const defaultCenter: [number, number] = 
    longitude && latitude ? [longitude, latitude] : [-98.5795, 39.8283];

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
        center: defaultCenter,
        zoom: selectedLocation ? 14 : 4,
      });

      map.current = instance;

      instance.addControl(new mapboxgl.NavigationControl(), 'top-right');

      instance.on('load', () => {
        setMapLoaded(true);
      });

      // Allow clicking on map to set location
      if (editable) {
        instance.on('click', async (e) => {
          const { lng, lat } = e.lngLat;
          
          try {
            const results = await geocodeMutation.mutateAsync({
              coordinates: [lng, lat],
            });
            
            if (results.length > 0) {
              const newLocation = {
                latitude: lat,
                longitude: lng,
                address: results[0].address,
              };
              setSelectedLocation(newLocation);
              setSearchAddress(results[0].address);
              onLocationChange?.(newLocation);
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
          }
        });
      }

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
      markerRef.current?.remove();
      markerRef.current = null;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update marker when location changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing marker
    markerRef.current?.remove();
    markerRef.current = null;

    if (selectedLocation) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border-2 border-white cursor-pointer transform hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
      `;

      markerRef.current = new mapboxgl.Marker({ element: el, draggable: editable })
        .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <strong class="text-cyan-600">📍 Business Location</strong>
              <p class="text-sm text-gray-600 mt-1">${selectedLocation.address}</p>
            </div>
          `)
        )
        .addTo(map.current);

      // Handle marker drag
      if (editable) {
        markerRef.current.on('dragend', async () => {
          const lngLat = markerRef.current?.getLngLat();
          if (!lngLat) return;

          try {
            const results = await geocodeMutation.mutateAsync({
              coordinates: [lngLat.lng, lngLat.lat],
            });

            if (results.length > 0) {
              const newLocation = {
                latitude: lngLat.lat,
                longitude: lngLat.lng,
                address: results[0].address,
              };
              setSelectedLocation(newLocation);
              setSearchAddress(results[0].address);
              onLocationChange?.(newLocation);
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
          }
        });
      }

      // Center map on location
      map.current.flyTo({
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [selectedLocation, mapLoaded, editable]);

  const handleSearch = async () => {
    if (!searchAddress.trim()) return;

    try {
      const results = await geocodeMutation.mutateAsync({
        address: searchAddress,
      });

      if (results.length > 0) {
        const result = results[0];
        const newLocation = {
          latitude: result.coordinates[1],
          longitude: result.coordinates[0],
          address: result.address,
        };
        setSelectedLocation(newLocation);
        onLocationChange?.(newLocation);
        toast.success('Location found!');
      } else {
        toast.error('No results found for that address');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      toast.error('Failed to search for address');
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
                <p className="text-sm font-medium text-cyan-900">Mapbox token required for map features</p>
                <p className="text-xs text-cyan-700 mt-0.5">
                  Add a valid Mapbox token to enable location mapping.
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
              <Label htmlFor="mapbox-location-token">Mapbox public token</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="mapbox-location-token"
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

      {/* Search Bar with Autocomplete */}
      {editable && token && !tokenError && (
        <AddressAutocomplete
          value={searchAddress}
          onChange={setSearchAddress}
          onSelect={(result: AddressResult) => {
            const newLocation = {
              latitude: result.coordinates[1],
              longitude: result.coordinates[0],
              address: result.address,
            };
            setSelectedLocation(newLocation);
            setSearchAddress(result.address);
            onLocationChange?.(newLocation);
            toast.success('Location found!');
          }}
          placeholder="Search for your business address..."
        />
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="relative w-full" style={{ height }}>
          <div ref={mapContainer} className="absolute inset-0" />
          {!token && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center bg-muted/50">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-cyan-400 opacity-50" />
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

      {/* Selected Location Info */}
      {selectedLocation && (
        <Card className="border-cyan-200 bg-cyan-50/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-cyan-900">Business Location</p>
                <p className="text-sm text-cyan-700 truncate">{selectedLocation.address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editable && token && !tokenError && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Tip: Click anywhere on the map or drag the marker to set your business location
        </p>
      )}
    </div>
  );
}
