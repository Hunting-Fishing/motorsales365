import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, AlertTriangle, Calendar, Filter, Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { FuelDeliveryLocation, FuelDeliveryCustomer } from '@/hooks/useFuelDelivery';
import { useMapboxPublicToken } from '@/hooks/useMapboxPublicToken';
import { validateMapboxPublicToken } from '@/lib/mapbox/validateMapboxPublicToken';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
];

const FREQUENCY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'on_demand', label: 'On Demand' },
];

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const;

interface CustomerMapProps {
  locations: FuelDeliveryLocation[];
  customers: FuelDeliveryCustomer[];
  className?: string;
  onLocationClick?: (location: FuelDeliveryLocation) => void;
  onCreateLocationFromCustomer?: (customer: FuelDeliveryCustomer) => void;
}

export function CustomerMap({ locations, customers, className, onLocationClick, onCreateLocationFromCustomer }: CustomerMapProps) {
  const { token, setToken, hasEnvToken, isLoading: isLoadingToken } = useMapboxPublicToken();
  const [tokenInput, setTokenInput] = useState(token);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
  const [showLowFuelOnly, setShowLowFuelOnly] = useState(false);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark'>('light');

  // Fetch business location from settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['fuel-delivery-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_settings')
        .select('business_address, business_latitude, business_longitude')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toFiniteNumber = (value: unknown): number | null => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const { data: businessCenter, isFetching: isFetchingBusinessCenter } = useQuery({
    queryKey: [
      'fuel-delivery-business-center',
      token,
      settings?.business_address,
      settings?.business_latitude,
      settings?.business_longitude,
    ],
    enabled: Boolean(token) && !isLoadingSettings,
    queryFn: async () => {
      const lat = toFiniteNumber((settings as any)?.business_latitude);
      const lng = toFiniteNumber((settings as any)?.business_longitude);

      if (lat !== null && lng !== null) return [lng, lat] as [number, number];

      const address = ((settings as any)?.business_address as string | null) || '';
      if (!address || !token) return null;

      const encoded = encodeURIComponent(address);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&country=US,CA&types=address,place,poi`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const feature = json?.features?.[0];
      const center = feature?.center as [number, number] | undefined;
      if (!center || center.length < 2) return null;
      return [center[0], center[1]] as [number, number];
    },
  });

  useEffect(() => {
    setTokenInput(token);
  }, [token]);

  // Geocode customers without coordinates but with addresses
  const customersNeedingGeocode = useMemo(() => {
    const locationCustomerIds = new Set(locations.map(l => l.customer_id).filter(Boolean));
    return customers.filter(cust => 
      !cust.billing_latitude && 
      !cust.billing_longitude && 
      cust.billing_address && 
      !locationCustomerIds.has(cust.id)
    );
  }, [customers, locations]);

  // Geocode locations without coordinates but with addresses
  const locationsNeedingGeocode = useMemo(() => {
    return locations.filter(loc => 
      !loc.latitude && 
      !loc.longitude && 
      loc.address
    );
  }, [locations]);

  // Geocode addresses for customers without coordinates
  const { data: geocodedCustomers } = useQuery({
    queryKey: ['geocode-customers', customersNeedingGeocode.map(c => c.id), token],
    enabled: Boolean(token) && customersNeedingGeocode.length > 0,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    queryFn: async () => {
      const results: Map<string, [number, number]> = new Map();
      
      // Geocode up to 10 customers at a time to avoid rate limits
      const toGeocode = customersNeedingGeocode.slice(0, 10);
      
      for (const cust of toGeocode) {
        if (!cust.billing_address) continue;
        try {
          const encoded = encodeURIComponent(cust.billing_address);
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&country=US,CA&types=address,place,poi`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const center = json?.features?.[0]?.center as [number, number] | undefined;
            if (center && center.length >= 2) {
              results.set(cust.id, [center[0], center[1]]);
            }
          }
        } catch (e) {
          console.warn('Geocoding failed for customer:', cust.id, e);
        }
      }
      
      return results;
    },
  });

  // Geocode addresses for locations without coordinates
  const { data: geocodedLocations } = useQuery({
    queryKey: ['geocode-locations', locationsNeedingGeocode.map(l => l.id), token],
    enabled: Boolean(token) && locationsNeedingGeocode.length > 0,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    queryFn: async () => {
      const results: Map<string, [number, number]> = new Map();
      
      // Geocode up to 10 locations at a time to avoid rate limits
      const toGeocode = locationsNeedingGeocode.slice(0, 10);
      
      for (const loc of toGeocode) {
        if (!loc.address) continue;
        try {
          const encoded = encodeURIComponent(loc.address);
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&country=US,CA&types=address,place,poi`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const center = json?.features?.[0]?.center as [number, number] | undefined;
            if (center && center.length >= 2) {
              results.set(loc.id, [center[0], center[1]]);
              // Also update the database with the geocoded coordinates
              supabase
                .from('fuel_delivery_locations')
                .update({ latitude: center[1], longitude: center[0] })
                .eq('id', loc.id)
                .then(({ error }) => {
                  if (error) console.warn('Failed to update location coordinates:', loc.id, error);
                });
            }
          }
        } catch (e) {
          console.warn('Geocoding failed for location:', loc.id, e);
        }
      }
      
      return results;
    },
  });

  // Build a combined list of markers from locations + customers (fallback)
  const allMarkerData = useMemo(() => {
    const markers: Array<{
      id: string;
      type: 'location' | 'customer';
      latitude: number;
      longitude: number;
      customerId?: string;
      locationName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      fuelType?: string;
      tankCapacity?: number;
      currentLevel?: number;
      deliveryDays?: number[];
      deliveryFrequency?: string;
    }> = [];

    // Add all locations with coordinates (either stored or geocoded)
    locations.forEach(loc => {
      let lat = loc.latitude;
      let lng = loc.longitude;
      
      // Check if we have geocoded coordinates for this location
      if ((!lat || !lng) && geocodedLocations?.has(loc.id)) {
        const coords = geocodedLocations.get(loc.id)!;
        lng = coords[0];
        lat = coords[1];
      }
      
      if (lat && lng) {
        markers.push({
          id: loc.id,
          type: 'location',
          latitude: lat,
          longitude: lng,
          customerId: loc.customer_id,
          locationName: loc.location_name,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          zipCode: loc.zip_code,
          fuelType: loc.fuel_type,
          tankCapacity: loc.tank_capacity_gallons,
          currentLevel: loc.current_level_gallons,
          deliveryDays: loc.delivery_days,
          deliveryFrequency: loc.delivery_frequency,
        });
      }
    });

    // Add customers with coordinates who don't have a location entry (fallback)
    const locationCustomerIds = new Set(locations.map(l => l.customer_id).filter(Boolean));
    customers.forEach(cust => {
      // Skip if this customer already has a location displayed
      if (locationCustomerIds.has(cust.id)) {
        // Check if the location for this customer is in our markers (has coordinates)
        const customerHasVisibleLocation = markers.some(m => m.customerId === cust.id && m.type === 'location');
        if (customerHasVisibleLocation) return;
      }
      
      // Check for existing coordinates
      if (cust.billing_latitude && cust.billing_longitude) {
        markers.push({
          id: `customer-${cust.id}`,
          type: 'customer',
          latitude: cust.billing_latitude,
          longitude: cust.billing_longitude,
          customerId: cust.id,
          locationName: 'Primary Location',
          address: cust.billing_address,
          fuelType: cust.preferred_fuel_type,
          deliveryDays: cust.delivery_days,
          deliveryFrequency: cust.delivery_frequency,
        });
      } 
      // Check for geocoded coordinates
      else if (geocodedCustomers?.has(cust.id)) {
        const coords = geocodedCustomers.get(cust.id)!;
        markers.push({
          id: `customer-${cust.id}`,
          type: 'customer',
          latitude: coords[1],
          longitude: coords[0],
          customerId: cust.id,
          locationName: 'Primary Location',
          address: cust.billing_address,
          fuelType: cust.preferred_fuel_type,
          deliveryDays: cust.delivery_days,
          deliveryFrequency: cust.delivery_frequency,
        });
      }
    });

    return markers;
  }, [locations, customers, geocodedCustomers, geocodedLocations]);

  // Filter markers based on criteria
  const filteredMarkers = useMemo(() => {
    return allMarkerData.filter((marker) => {
      // Filter by selected days (only applicable to locations)
      if (selectedDays.length > 0) {
        const markerDays = marker.deliveryDays || [];
        const hasMatchingDay = selectedDays.some((day) => markerDays.includes(day));
        if (!hasMatchingDay && marker.type === 'location') return false;
        // For customers without location, show them if no day filter applied to their non-existent schedule
        if (marker.type === 'customer') return true; // Always show customers when filtering by days
      }

      // Filter by frequency (only applicable to locations)
      if (selectedFrequency !== 'all') {
        if (marker.type === 'location' && marker.deliveryFrequency !== selectedFrequency) return false;
        // Show customers regardless of frequency since they don't have one set
      }

      // Filter by low fuel (only applicable to locations with tank data)
      if (showLowFuelOnly) {
        const tankPercent =
          marker.tankCapacity && marker.currentLevel
            ? (marker.currentLevel / marker.tankCapacity) * 100
            : null;
        if (tankPercent === null || tankPercent >= 25) return false;
      }

      return true;
    });
  }, [allMarkerData, selectedDays, selectedFrequency, showLowFuelOnly]);

  // Get customer name for a location
  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Unknown';
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return 'Unknown';
    return customer.company_name || customer.contact_name || 'Unknown';
  };

  // Calculate center from filtered markers or use business location
  const getCenter = (): [number, number] => {
    // First priority: business center (lat/lng or geocoded from address)
    if (businessCenter) return businessCenter;

    // Second priority: center of markers if available
    if (filteredMarkers.length > 0) {
      const avgLng = filteredMarkers.reduce((sum, m) => sum + m.longitude, 0) / filteredMarkers.length;
      const avgLat = filteredMarkers.reduce((sum, m) => sum + m.latitude, 0) / filteredMarkers.length;
      return [avgLng, avgLat];
    }

    // Fallback: Center of US
    return [-98.5795, 39.8283];
  };

  // Format delivery schedule for display
  const formatSchedule = (marker: typeof allMarkerData[0]) => {
    const days = marker.deliveryDays || [];
    const dayNames = days
      .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label || '')
      .join(', ');
    const freq = FREQUENCY_OPTIONS.find((f) => f.value === marker.deliveryFrequency)?.label || 'Not set';
    return `${freq}${dayNames ? ` (${dayNames})` : ''}`;
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!mapContainer.current || !token) return;
      if (isLoadingSettings) return;

      // If the user has a business address but no coordinates saved yet, wait for the geocode attempt
      // so we don't initialize at the US fallback.
      const hasBusinessAddress = Boolean((settings as any)?.business_address);
      if (hasBusinessAddress && !businessCenter && isFetchingBusinessCenter) return;

      setMapLoaded(false);
      setTokenError(null);

      // Proactively validate the token so we can show a clear UI instead of a blank map.
      const validation = await validateMapboxPublicToken({ token, styleId: mapStyle === 'dark' ? 'mapbox/dark-v11' : 'mapbox/streets-v12' });
      if (cancelled) return;

      if (!validation.ok) {
        setTokenError(validation.message || 'Invalid Mapbox token.');
        return;
      }

      mapboxgl.accessToken = token;

      // Determine zoom level based on available data
      const hasBusinessLocation = Boolean(businessCenter);
      const defaultZoom = hasBusinessLocation ? 10 : (filteredMarkers.length > 0 ? 8 : 4);

      const instance = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: getCenter(),
        zoom: defaultZoom,
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
  }, [
    token,
    mapStyle,
    isLoadingSettings,
    isFetchingBusinessCenter,
    (settings as any)?.business_address,
    businessCenter?.[0],
    businessCenter?.[1],
  ]);

  // Update markers when filtered markers change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers
    filteredMarkers.forEach((markerData) => {
      const customerName = getCustomerName(markerData.customerId);
      const tankPercent =
        markerData.tankCapacity && markerData.currentLevel
          ? Math.round((markerData.currentLevel / markerData.tankCapacity) * 100)
          : null;

      const isLowFuel = tankPercent !== null && tankPercent < 25;
      const isCustomerFallback = markerData.type === 'customer';
      
      // Use different colors: green for customer fallback, blue for locations, red for low fuel
      const markerColor = isLowFuel 
        ? 'from-red-500 to-rose-600' 
        : isCustomerFallback 
          ? 'from-green-500 to-emerald-600' 
          : 'from-blue-500 to-indigo-600';

      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      el.innerHTML = `
        <div class="relative group">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br ${markerColor} flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          ${isLowFuel ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse"><span class="text-white text-[8px] font-bold">!</span></div>' : ''}
          ${isCustomerFallback ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center"><span class="text-white text-[8px] font-bold">C</span></div>' : ''}
        </div>
      `;

      const schedule = formatSchedule(markerData);
      // For customers, show address; for locations, show location name with address
      const displayLocation = isCustomerFallback 
        ? markerData.address || 'No address'
        : markerData.locationName || markerData.address || 'Unknown location';
      const displayAddress = !isCustomerFallback && markerData.address && markerData.locationName !== markerData.address
        ? markerData.address 
        : '';
      
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[220px]">
          <div class="font-bold text-gray-900">${customerName}</div>
          <div class="text-sm text-gray-600 mt-1">${displayLocation}</div>
          ${displayAddress ? `<div class="text-xs text-gray-500 mt-0.5">${displayAddress}</div>` : ''}
          <div class="text-xs text-gray-500 mt-1">${markerData.city || ''} ${markerData.state || ''} ${markerData.zipCode || ''}</div>
          ${isCustomerFallback ? `
            <div class="text-xs text-amber-600 mt-1 font-medium">📍 No delivery location set - using billing address</div>
            <button 
              data-customer-id="${markerData.customerId}" 
              class="create-location-btn mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
            >
              + Create Delivery Location
            </button>
          ` : ''}
          <div class="mt-2 pt-2 border-t border-gray-100">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500">Schedule:</span>
              <span class="font-medium text-blue-600">${schedule}</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-1">
              <span class="text-gray-500">Fuel Type:</span>
              <span class="font-medium">${markerData.fuelType || 'N/A'}</span>
            </div>
            ${tankPercent !== null ? `
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="text-gray-500">Tank Level:</span>
                <span class="font-medium ${isLowFuel ? 'text-red-600' : ''}">${tankPercent}%</span>
              </div>
            ` : ''}
            ${markerData.tankCapacity ? `
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="text-gray-500">Tank Capacity:</span>
                <span class="font-medium">${markerData.tankCapacity.toLocaleString()} gal</span>
              </div>
            ` : ''}
          </div>
        </div>
      `);

      // Add click handler for the create location button
      popup.on('open', () => {
        const btn = document.querySelector(`[data-customer-id="${markerData.customerId}"].create-location-btn`);
        if (btn && onCreateLocationFromCustomer) {
          btn.addEventListener('click', () => {
            const customer = customers.find(c => c.id === markerData.customerId);
            if (customer) {
              onCreateLocationFromCustomer(customer);
              popup.remove();
            }
          });
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.longitude, markerData.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (filteredMarkers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredMarkers.forEach((m) => bounds.extend([m.longitude, m.latitude]));

      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12,
      });
    } else if (filteredMarkers.length === 1) {
      map.current.flyTo({
        center: [filteredMarkers[0].longitude, filteredMarkers[0].latitude],
        zoom: 12,
      });
    }
  }, [filteredMarkers, customers, mapLoaded]);

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const saveToken = () => {
    const next = tokenInput.trim();
    setToken(next);
    setTokenError(null);
  };

  // Show loading state while fetching token
  if (isLoadingToken) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-muted-foreground">Loading map...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Token prompt (needed for tiles/styles) */}
      {(!token || tokenError) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Mapbox public token required</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The map can't load until a valid Mapbox token is provided.
                  {' '}
                  <a className="underline" href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer">
                    Get a token
                  </a>
                  .
                </p>
                {tokenError && <p className="text-xs text-destructive mt-1">{tokenError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapbox-public-token">Mapbox public token</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="mapbox-public-token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="pk.eyJ..."
                  autoComplete="off"
                />
                <Button type="button" onClick={saveToken} className="sm:w-28">
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasEnvToken
                  ? 'This project already has VITE_MAPBOX_PUBLIC_TOKEN set; you may be using a browser-stored token overriding it.'
                  : 'Saved in this browser only. For production, set VITE_MAPBOX_PUBLIC_TOKEN.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Days of Week Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Delivery Days
            </div>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  className="w-12 h-8"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
              {selectedDays.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDays([])}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Frequency Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Delivery Frequency
            </div>
            <ToggleGroup
              type="single"
              value={selectedFrequency}
              onValueChange={(v) => v && setSelectedFrequency(v)}
              className="justify-start flex-wrap"
            >
              {FREQUENCY_OPTIONS.map((freq) => (
                <ToggleGroupItem key={freq.value} value={freq.value} size="sm" className="px-3">
                  {freq.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={showLowFuelOnly ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setShowLowFuelOnly(!showLowFuelOnly)}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Low Fuel Only
              </Button>
            </div>

            {/* Map Style Toggle */}
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <Switch
                checked={mapStyle === 'dark'}
                onCheckedChange={(checked) => setMapStyle(checked ? 'dark' : 'light')}
              />
              <Moon className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-muted-foreground ml-1">
                {mapStyle === 'dark' ? 'Dark' : 'Light'} Map
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="relative h-[500px] w-full">
          <div ref={mapContainer} className="absolute inset-0" />
          {!token && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Enter a Mapbox token above to load the map.
            </div>
          )}
          {tokenError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Map failed to load. Please update the token above.
            </div>
          )}
        </div>
      </Card>

      {/* Legend & Stats */}
      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {filteredMarkers.length} of {allMarkerData.length} Locations/Customers
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
          <span>Location</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600" />
          <span>Customer (no location)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-rose-600" />
          <span>Low Fuel (&lt;25%)</span>
        </div>
      </div>
    </div>
  );
}
