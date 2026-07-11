import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, Calendar, Clock, Plus, Play, Navigation, ArrowLeft, Route,
  AlertCircle, User, ChevronDown, ChevronUp, Truck, Home, Building2,
  CheckCircle2, Circle, ArrowDown, Maximize2, Loader2, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouteOptimization, Location } from '@/hooks/useMapbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ─── Types ───────────────────────────────────────────────────────
interface SepticRoute {
  id: string;
  route_date: string;
  route_name: string | null;
  driver_id: string | null;
  truck_id: string | null;
  status: string;
  total_distance_miles: number | null;
  estimated_duration_minutes: number | null;
  total_jobs: number | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

interface SepticRouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  service_order_id: string | null;
  customer_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  estimated_duration_minutes: number | null;
  status: string;
  notes: string | null;
  drive_time_minutes: number | null;
  distance_from_previous_miles: number | null;
  septic_service_orders?: {
    id: string;
    order_number: string | null;
    status: string | null;
    customer_id: string | null;
    septic_customers?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

interface SepticDriver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
}

interface UnassignedOrder {
  id: string;
  order_number: string | null;
  location_address: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string | null;
  location_lat: number | null;
  location_lng: number | null;
  customer_id: string | null;
}

// ─── Inline RouteMapView for Septic ─────────────────────────────
function SepticRouteMapView({
  stops,
  shopLocation,
  mapboxToken,
  optimizedRoute,
  isOptimizing = false,
  className,
}: {
  stops: { id: string; stop_order: number; address: string; latitude?: number; longitude?: number; status: string; order_number?: string }[];
  shopLocation?: { lat: number; lng: number; address: string };
  mapboxToken?: string | null;
  optimizedRoute?: any;
  isOptimizing?: boolean;
  className?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const validStops = stops.filter(s => s.latitude && s.longitude);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    const defaultCenter: [number, number] = shopLocation
      ? [shopLocation.lng, shopLocation.lat]
      : validStops[0]
        ? [validStops[0].longitude!, validStops[0].latitude!]
        : [-124.9, 49.7];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 11,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    return () => { map.current?.remove(); };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (shopLocation) {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold shadow-lg border-2 border-white';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([shopLocation.lng, shopLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>Shop</strong><br/>${shopLocation.address}`))
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    validStops.forEach(stop => {
      const el = document.createElement('div');
      const isCompleted = stop.status === 'completed';
      const isActive = stop.status === 'in_progress' || stop.status === 'arrived';
      el.className = cn(
        'flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110',
        isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'
      );
      el.textContent = String(stop.stop_order);
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="min-width:150px"><strong>Stop ${stop.stop_order}</strong><br/><span style="color:#666">${stop.order_number || ''}</span><br/><small style="color:#888">${stop.address}</small></div>
      `);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude!, stop.latitude!])
        .setPopup(popup)
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    if (validStops.length > 0 || shopLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      if (shopLocation) bounds.extend([shopLocation.lng, shopLocation.lat]);
      validStops.forEach(s => bounds.extend([s.longitude!, s.latitude!]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [stops, shopLocation]);

  // Draw optimized route line
  useEffect(() => {
    if (!map.current || !optimizedRoute?.geometry) return;
    const sourceId = 'route-line';
    const layerId = 'route-line-layer';
    const drawRoute = () => {
      if (map.current!.getLayer(layerId)) map.current!.removeLayer(layerId);
      if (map.current!.getSource(sourceId)) map.current!.removeSource(sourceId);
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: optimizedRoute.geometry }
      });
      map.current!.addLayer({
        id: layerId, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.8 }
      });
    };
    if (map.current.isStyleLoaded()) drawRoute();
    else map.current.on('style.load', drawRoute);
  }, [optimizedRoute]);

  if (!mapboxToken) {
    return (
      <Card className={cn("border-border", className)}>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Map preview unavailable. Configure Mapbox token in settings.</p>
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
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />Optimizing...
              </Badge>
            )}
            {optimizedRoute && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{optimizedRoute.distanceMiles?.toFixed(1)} mi</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{optimizedRoute.durationMinutes} min</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className={cn("w-full transition-all duration-300", isFullscreen ? "h-[600px]" : "h-[350px]")} />
        <div className="flex items-center gap-4 p-3 border-t border-border bg-muted/30 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-green-500" /><span>Shop</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-primary" /><span>Pending</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-amber-500" /><span>Active</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-indigo-500/80" style={{ width: '20px', height: '4px' }} /><span>Route</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function SepticRoutes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState<SepticRoute | null>(null);
  const routeOptimization = useRouteOptimization();

  // Shop data
  const { data: shopData } = useQuery({
    queryKey: ['current-shop-septic-routes'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('shop_id, shops(id, name, address, latitude, longitude)')
        .or(`id.eq.${user.user.id},user_id.eq.${user.user.id}`)
        .maybeSingle();
      if (!data?.shops) {
        const { data: directShop } = await supabase.from('shops').select('id, name, address, latitude, longitude').limit(1).maybeSingle();
        return directShop;
      }
      return data?.shops as any;
    },
  });

  // Drivers
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['septic-drivers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_employees')
        .select('id, first_name, last_name, status, septic_employee_roles!inner(role)')
        .eq('status', 'active')
        .eq('septic_employee_roles.role', 'driver')
        .order('first_name');
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, first_name: d.first_name, last_name: d.last_name, status: d.status })) as SepticDriver[];
    },
  });

  const weekStart = useMemo(() => startOfWeek(new Date(selectedDate)), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Routes
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['septic-routes', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_routes')
        .select('*')
        .gte('route_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('route_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('route_date');
      if (error) throw error;
      return (data || []) as SepticRoute[];
    },
  });

  // Route stops
  const { data: routeStops = [] } = useQuery({
    queryKey: ['septic-route-stops', selectedRoute?.id],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const { data, error } = await supabase
        .from('septic_route_stops')
        .select('*, septic_service_orders(id, order_number, status, customer_id, septic_customers(id, first_name, last_name))')
        .eq('route_id', selectedRoute.id)
        .order('stop_order');
      if (error) throw error;
      return (data || []) as SepticRouteStop[];
    },
    enabled: !!selectedRoute,
  });

  // Update stop status
  const updateStopStatus = useMutation({
    mutationFn: async ({ stopId, status, previousStatus, serviceOrderId }: { stopId: string; status: string; previousStatus?: string; serviceOrderId?: string | null }) => {
      const updates: Record<string, any> = { status };
      if (status === 'arrived') updates.actual_arrival = new Date().toISOString();
      const { error } = await supabase.from('septic_route_stops').update(updates).eq('id', stopId);
      if (error) throw error;

      // Log status change
      if (serviceOrderId) {
        const { data: userData } = await supabase.auth.getUser();
        const { data: profile } = userData?.user?.id
          ? await supabase.from('profiles').select('first_name, last_name').eq('id', userData.user.id).maybeSingle()
          : { data: null };
        const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null;

        await supabase.from('septic_order_status_log' as any).insert({
          shop_id: (await supabase.from('septic_service_orders').select('shop_id').eq('id', serviceOrderId).single()).data?.shop_id,
          service_order_id: serviceOrderId,
          previous_status: previousStatus || null,
          new_status: status,
          changed_by: userData?.user?.id || null,
          changed_by_name: profileName || 'System',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-route-stops'] });
      toast.success('Stop status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Skip stop — remove from route and set order back to pending
  const skipStop = useMutation({
    mutationFn: async ({ stopId, serviceOrderId, routeId }: { stopId: string; serviceOrderId: string | null; routeId: string }) => {
      const { error: delErr } = await supabase.from('septic_route_stops').delete().eq('id', stopId);
      if (delErr) throw delErr;
      if (serviceOrderId) {
        await supabase.from('septic_service_orders').update({ status: 'pending' }).eq('id', serviceOrderId);
      }
      // Decrement total_jobs
      const { data: remaining } = await supabase.from('septic_route_stops').select('id').eq('route_id', routeId);
      await supabase.from('septic_routes').update({ total_jobs: remaining?.length || 0 }).eq('id', routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['septic-routes'] });
      queryClient.invalidateQueries({ queryKey: ['septic-unassigned-orders'] });
      toast.success('Stop skipped — order moved to unassigned');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Unassigned service orders
  const { data: unassignedOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['septic-unassigned-orders', selectedDate],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, location_address, scheduled_date, scheduled_time, status, location_lat, location_lng, customer_id')
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .in('status', ['pending', 'scheduled', 'confirmed']);
      if (error) throw error;

      // Filter out orders already on routes
      const { data: stops } = await supabase.from('septic_route_stops').select('service_order_id');
      const assignedIds = new Set((stops || []).map(s => s.service_order_id).filter(Boolean));
      return (orders || []).filter(o => !assignedIds.has(o.id)) as UnassignedOrder[];
    },
  });

  // Mapbox token
  const { data: mapboxToken } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) return null;
      return data?.token || null;
    },
  });

  // Create route
  const createRouteMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!shopData?.id) throw new Error('Shop data not available');
      const { data, error } = await supabase
        .from('septic_routes')
        .insert({
          shop_id: shopData.id,
          route_date: date,
          route_name: `Pump Route ${format(new Date(date), 'MMM d')}`,
          status: 'planned',
        })
        .select()
        .single();
      if (error) throw error;
      return data as SepticRoute;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['septic-routes'] });
      toast.success('Route created');
      setSelectedRoute(data);
    },
    onError: () => toast.error('Failed to create route'),
  });

  // Update route status
  const updateRouteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('septic_routes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-routes'] });
      toast.success('Route status updated');
    },
  });

  // Add order to route
  const addOrderToRoute = useMutation({
    mutationFn: async (order: UnassignedOrder) => {
      if (!shopData?.id) throw new Error('Shop data not available');
      let routeId = selectedRoute?.id;
      if (!routeId) {
        const newRoute = await createRouteMutation.mutateAsync(selectedDate);
        routeId = newRoute.id;
      }
      const { data: existing } = await supabase.from('septic_route_stops').select('id').eq('route_id', routeId);
      const nextOrder = (existing?.length || 0) + 1;
      const { error } = await supabase.from('septic_route_stops').insert({
        shop_id: shopData.id,
        route_id: routeId,
        service_order_id: order.id,
        customer_id: order.customer_id,
        address: order.location_address,
        latitude: order.location_lat,
        longitude: order.location_lng,
        stop_order: nextOrder,
        status: 'pending',
      });
      if (error) throw error;
      await supabase.from('septic_routes').update({ total_jobs: nextOrder }).eq('id', routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['septic-route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['septic-routes'] });
      toast.success('Service order added to route');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add to route'),
  });

  // Optimize route
  const handleOptimizeRoute = async () => {
    if (!selectedRoute || routeStops.length < 2) {
      toast.error('Need at least 2 stops to optimize');
      return;
    }
    const origin: [number, number] = shopData?.longitude && shopData?.latitude
      ? [shopData.longitude, shopData.latitude]
      : routeStops[0].longitude && routeStops[0].latitude
        ? [routeStops[0].longitude, routeStops[0].latitude]
        : [-124.9, 49.7];

    const destinations: Location[] = routeStops
      .filter(s => s.latitude && s.longitude)
      .map(s => ({
        id: s.id,
        address: s.address || '',
        coordinates: [s.longitude!, s.latitude!] as [number, number],
        name: `Stop ${s.stop_order}`,
      }));

    try {
      const result = await routeOptimization.mutateAsync({ origin, destinations, returnToOrigin: true });
      await supabase.from('septic_routes').update({
        total_distance_miles: result.optimizedRoute.distanceMiles,
        estimated_duration_minutes: result.optimizedRoute.durationMinutes,
      }).eq('id', selectedRoute.id);

      for (let i = 0; i < result.optimizedOrder.length; i++) {
        const stop = result.optimizedOrder[i];
        const leg = result.legs[i];
        await supabase.from('septic_route_stops').update({
          stop_order: i + 1,
          drive_time_minutes: leg?.durationMinutes,
          distance_from_previous_miles: leg?.distanceMiles,
        }).eq('id', stop.id);
      }
      queryClient.invalidateQueries({ queryKey: ['septic-route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['septic-routes'] });
      toast.success(`Route optimized! ${result.optimizedRoute.distanceMiles} miles, ${result.optimizedRoute.durationMinutes} min`);
    } catch {
      toast.error('Failed to optimize route');
    }
  };

  // Week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
      dayNum: format(date, 'd'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    };
  });

  const filteredRoutes = useMemo(() => {
    if (selectedDriver === 'all') return routes;
    return routes.filter(r => r.driver_id === selectedDriver);
  }, [routes, selectedDriver]);

  const routesForDate = filteredRoutes.filter(r => r.route_date === selectedDate);

  const getDriverName = (route: SepticRoute) => {
    if (!route.driver_id) return 'Unassigned';
    const driver = drivers.find(d => d.id === route.driver_id);
    return driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : 'Unknown';
  };

  const getDriverInitials = (route: SepticRoute) => {
    const name = getDriverName(route);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'UN';
  };

  const shopLocation = shopData?.latitude && shopData?.longitude ? {
    lat: shopData.latitude, lng: shopData.longitude, address: shopData.address || 'Shop'
  } : undefined;

  const transformedStops = routeStops.map(s => ({
    id: s.id,
    stop_order: s.stop_order,
    address: s.address || '',
    latitude: s.latitude ?? undefined,
    longitude: s.longitude ?? undefined,
    status: s.status,
    order_number: (s.septic_service_orders as any)?.order_number || '',
    customer_name: (s.septic_service_orders as any)?.septic_customers
      ? `${(s.septic_service_orders as any).septic_customers.first_name || ''} ${(s.septic_service_orders as any).septic_customers.last_name || ''}`.trim()
      : '',
    service_order_id: s.service_order_id,
    customer_id: s.customer_id,
    drive_time_minutes: s.drive_time_minutes,
    distance_from_previous_miles: s.distance_from_previous_miles,
    estimated_duration_minutes: s.estimated_duration_minutes,
  }));

  const ordersForDate = unassignedOrders.filter(o => o.scheduled_date === selectedDate);
  const otherOrders = unassignedOrders.filter(o => o.scheduled_date !== selectedDate);

  const isLoading = routesLoading || ordersLoading;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/septic')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Navigation className="h-8 w-8 text-emerald-500" />
              Route Planning
            </h1>
            <p className="text-muted-foreground mt-1">Optimize pump truck routes for maximum efficiency</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Driver filter */}
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-[200px] bg-background border-border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter by driver" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border shadow-lg z-50">
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name || ''} {d.last_name || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-48" />
          </div>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map(day => {
          const dayRoutes = filteredRoutes.filter(r => r.route_date === day.date);
          const dayOrders = unassignedOrders.filter(o => o.scheduled_date === day.date);
          return (
            <Button
              key={day.date}
              variant={day.date === selectedDate ? 'default' : 'outline'}
              className={`flex flex-col h-20 relative ${day.isToday ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedDate(day.date)}
            >
              <span className="text-xs opacity-70">{day.dayName}</span>
              <span className="text-lg font-bold">{day.dayNum}</span>
              <div className="flex gap-1 mt-1">
                {dayRoutes.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0">{dayRoutes.length}r</Badge>}
                {dayOrders.length > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-500">{dayOrders.length}j</Badge>}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Split View */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Route Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />Driver Routes
            </h3>
            <Button size="sm" variant="outline" onClick={() => createRouteMutation.mutate(selectedDate)}>
              <Plus className="h-4 w-4 mr-1" />New Route
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-48" />)}</div>
          ) : routesForDate.length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {routesForDate.map(route => {
                const isSelected = selectedRoute?.id === route.id;
                const stopsForCard = isSelected ? transformedStops : [];
                const sortedStops = [...stopsForCard].sort((a, b) => a.stop_order - b.stop_order);

                return (
                  <div key={route.id} onClick={() => setSelectedRoute(route)}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary rounded-lg' : ''}`}>
                    <Card className="border-border overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getDriverInitials(route)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{getDriverName(route)}</CardTitle>
                              <p className="text-sm text-muted-foreground">{route.route_name || `Route for ${format(new Date(route.route_date), 'MMM d')}`}</p>
                            </div>
                          </div>
                          <Badge className={
                            route.status === 'planned' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            route.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            route.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            'bg-muted text-muted-foreground'
                          }>
                            {route.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground"><Truck className="h-4 w-4" /><span>{route.total_jobs || 0} stops</span></div>
                          {route.total_distance_miles && <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{Number(route.total_distance_miles).toFixed(1)} mi</span></div>}
                          {route.estimated_duration_minutes && <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /><span>{Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m</span></div>}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {isSelected && (
                          <div className="px-4 py-3 space-y-0">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center"><Home className="h-4 w-4 text-green-500" /></div>
                                {sortedStops.length > 0 && <div className="w-0.5 h-8 bg-border mt-1" />}
                              </div>
                              <div className="flex-1 pb-3">
                                <p className="font-medium text-sm">START: {shopData?.address || 'Shop'}</p>
                                <p className="text-xs text-muted-foreground">8:00 AM</p>
                              </div>
                            </div>

                            {sortedStops.map((stop, idx) => (
                              <div key={stop.id}>
                                {stop.drive_time_minutes && (
                                  <div className="flex items-center gap-3 py-1">
                                    <div className="flex flex-col items-center w-8"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>
                                    <p className="text-xs text-muted-foreground">↓ {Number(stop.drive_time_minutes).toFixed(0)} min / {stop.distance_from_previous_miles ? Number(stop.distance_from_previous_miles).toFixed(1) : '?'} mi</p>
                                  </div>
                                )}
                                <div className={cn(
                                  "flex items-start gap-3 hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors cursor-pointer",
                                  stop.status === 'in_progress' && "bg-accent/50",
                                  stop.status === 'completed' && "opacity-60"
                                )}
                                  onClick={() => stop.service_order_id && navigate(`/septic/orders/${stop.service_order_id}`)}
                                >
                                  <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-sm font-bold text-primary">{stop.stop_order}</span></div>
                                    {idx < sortedStops.length - 1 && <div className="w-0.5 h-full min-h-[40px] bg-border mt-1" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <p className="font-medium text-sm truncate">{stop.address}</p>
                                      {stop.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                       stop.status === 'in_progress' ? <Circle className="h-5 w-5 text-amber-500 fill-amber-500" /> :
                                       stop.status === 'skipped' ? <AlertCircle className="h-5 w-5 text-destructive" /> :
                                       <Circle className="h-5 w-5 text-muted-foreground" />}
                                    </div>
                                    {stop.customer_name && (
                                      <p className="text-xs font-medium text-primary truncate">{stop.customer_name}</p>
                                    )}
                                    {stop.order_number && (
                                      <p className="text-xs text-muted-foreground">Order: {stop.order_number}</p>
                                    )}
                                    <span className="text-xs text-muted-foreground">Est. {stop.estimated_duration_minutes || 30} min</span>
                                    
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                      <Select
                                        value={stop.status}
                                        onValueChange={(val) => {
                                          const original = routeStops.find(rs => rs.id === stop.id);
                                          if (original) updateStopStatus.mutate({
                                            stopId: stop.id,
                                            status: val,
                                            previousStatus: stop.status,
                                            serviceOrderId: stop.service_order_id || null,
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-xs w-[110px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="arrived">Arrived</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {stop.latitude && stop.longitude && (
                                        <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`, '_blank')}>
                                          <Navigation className="h-3 w-3 mr-1" />Nav
                                        </Button>
                                      )}
                                      {stop.customer_id && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
                                          onClick={() => navigate(`/septic/customers/${stop.customer_id}`)}>
                                          <User className="h-3 w-3 mr-1" />Customer
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                                        onClick={() => skipStop.mutate({ stopId: stop.id, serviceOrderId: stop.service_order_id || null, routeId: selectedRoute!.id })}>
                                        Skip
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {sortedStops.length === 0 && (
                              <div className="text-center py-6 text-muted-foreground">
                                <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No stops added yet</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 p-4 border-t border-border bg-muted/20">
                          {isSelected && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={handleOptimizeRoute}
                              disabled={routeOptimization.isPending || sortedStops.length < 2}>
                              <Navigation className="h-4 w-4 mr-1" />{routeOptimization.isPending ? 'Optimizing...' : 'Optimize Route'}
                            </Button>
                          )}
                          {route.status === 'planned' && (
                            <Button size="sm" className="flex-1" onClick={() => updateRouteStatus.mutate({ id: route.id, status: 'in_progress' })}>
                              <Play className="h-4 w-4 mr-1" />Start Route
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/30">
              <CardContent className="p-8 text-center">
                <Navigation className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h4 className="font-semibold mb-1">No Routes for {format(new Date(selectedDate), 'MMM d')}</h4>
                <p className="text-sm text-muted-foreground mb-4">Create a route to organize your service orders</p>
                <Button onClick={() => createRouteMutation.mutate(selectedDate)}>
                  <Plus className="h-4 w-4 mr-2" />Create Route
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Map + Stats */}
        <div className="lg:col-span-7 space-y-4">
          <SepticRouteMapView
            stops={transformedStops}
            shopLocation={shopLocation}
            mapboxToken={mapboxToken}
            optimizedRoute={routeOptimization.data?.optimizedRoute}
            isOptimizing={routeOptimization.isPending}
            className="lg:sticky lg:top-6"
          />

          {selectedRoute && (
            <Card className="border-border bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{transformedStops.length}</p>
                    <p className="text-xs text-muted-foreground">Stops</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedRoute.total_distance_miles ? Number(selectedRoute.total_distance_miles).toFixed(1) : '—'}</p>
                    <p className="text-xs text-muted-foreground">Miles</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {selectedRoute.estimated_duration_minutes
                        ? `${Math.floor(selectedRoute.estimated_duration_minutes / 60)}h ${selectedRoute.estimated_duration_minutes % 60}m`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Est. Time</p>
                  </div>
                  <div>
                    <Badge className={
                      selectedRoute.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                      selectedRoute.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }>{selectedRoute.status.replace('_', ' ')}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Unassigned Orders */}
      <div className="mt-6">
        {unassignedOrders.length === 0 ? (
          <Card className="border-dashed border-2 border-green-500/30 bg-green-500/5">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">All service orders are assigned to routes!</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Unassigned Service Orders
                <Badge variant="secondary" className="ml-2">{unassignedOrders.length} total</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">These scheduled orders need to be added to a route</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {ordersForDate.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    {format(new Date(selectedDate), 'EEEE, MMM d')} ({ordersForDate.length})
                  </h4>
                  <div className="space-y-2">
                    {ordersForDate.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/10 border-amber-500/30">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-sm font-semibold text-primary">{order.order_number}</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{order.location_address || 'No address'}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-3 shrink-0"
                          onClick={() => addOrderToRoute.mutate(order)}
                          disabled={addOrderToRoute.isPending || createRouteMutation.isPending}>
                          <Plus className="h-4 w-4 mr-1" />{addOrderToRoute.isPending ? 'Adding...' : 'Add to Route'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {otherOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Other Days This Week ({otherOrders.length})</h4>
                  <div className="space-y-2">
                    {otherOrders.slice(0, 3).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 border-border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-primary">{order.order_number}</span>
                            <Badge variant="outline" className="text-xs">{order.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{order.location_address || 'No address'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />{order.scheduled_date && format(new Date(order.scheduled_date), 'MMM d')}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-3 shrink-0"
                          onClick={() => addOrderToRoute.mutate(order)}
                          disabled={addOrderToRoute.isPending}>
                          <Plus className="h-4 w-4 mr-1" />Add
                        </Button>
                      </div>
                    ))}
                    {otherOrders.length > 3 && <p className="text-sm text-muted-foreground text-center py-2">+{otherOrders.length - 3} more orders</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
