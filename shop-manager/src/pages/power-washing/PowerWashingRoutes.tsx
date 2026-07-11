import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Plus,
  Play,
  Navigation,
  ArrowLeft,
  Route
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { UnassignedJobsList } from '@/components/power-washing/UnassignedJobsList';
import { DriverFilterDropdown } from '@/components/power-washing/DriverFilterDropdown';
import { DriverRouteCard } from '@/components/power-washing/DriverRouteCard';
import { RouteMapView } from '@/components/power-washing/RouteMapView';
import { useRouteOptimization, Location } from '@/hooks/useMapbox';

interface RouteData {
  id: string;
  route_date: string;
  route_name: string | null;
  assigned_crew: any[];
  total_jobs: number;
  estimated_duration_minutes: number | null;
  total_distance_miles: number | null;
  status: string;
  start_location: string | null;
  end_location: string | null;
}

interface RouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  job_id: string;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  status: string;
  drive_time_minutes?: number | null;
  distance_from_previous_miles?: number | null;
  job?: {
    id: string;
    job_number: string;
    status: string | null;
    property_address: string | null;
    property_latitude: number | null;
    property_longitude: number | null;
    customer?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      company: string | null;
    } | null;
  } | null;
}

interface UnassignedJob {
  id: string;
  job_number: string;
  property_address: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  status: string | null;
  assigned_crew: string[] | null;
  property_latitude: number | null;
  property_longitude: number | null;
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
  } | null;
}

interface TeamMember {
  id: string;
  profile_id: string;
  is_active: boolean;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function PowerWashingRoutes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  const routeOptimization = useRouteOptimization();

  // Fetch shop data - using or() to handle both profile patterns and maybeSingle to prevent errors
  const { data: shopData } = useQuery({
    queryKey: ['current-shop-routes'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('shop_id, shops(id, name, address, latitude, longitude)')
        .or(`id.eq.${user.user.id},user_id.eq.${user.user.id}`)
        .maybeSingle();
      
      if (!data?.shops) {
        // Fallback: try to get shop_id directly
        const { data: directShop } = await supabase
          .from('shops')
          .select('id, name, address, latitude, longitude')
          .limit(1)
          .maybeSingle();
        return directShop;
      }
      
      return data?.shops as { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null } | null;
    },
  });

  // Fetch team members for driver filter
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['power-washing-team-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_team_members')
        .select(`
          id,
          profile_id,
          is_active,
          profile:profiles(id, first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });

  // Calculate week range
  const weekStart = useMemo(() => startOfWeek(new Date(selectedDate)), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Fetch routes for the week
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['power-washing-routes', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_routes')
        .select('*')
        .gte('route_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('route_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('route_date', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        assigned_crew: Array.isArray(r.assigned_crew) ? r.assigned_crew : []
      })) as RouteData[];
    },
  });

  // Fetch route stops for selected route
  const { data: routeStops = [] } = useQuery({
    queryKey: ['power-washing-route-stops', selectedRoute?.id],
    queryFn: async () => {
      if (!selectedRoute) return [];
      
      const { data, error } = await supabase
        .from('power_washing_route_stops')
        .select(`
          id, route_id, stop_order, job_id, estimated_arrival, actual_arrival, 
          status, drive_time_minutes, distance_from_previous_miles,
          job:power_washing_jobs(
            id, job_number, status, property_address, property_latitude, property_longitude,
            customer:customers(id, first_name, last_name, company)
          )
        `)
        .eq('route_id', selectedRoute.id)
        .order('stop_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as RouteStop[];
    },
    enabled: !!selectedRoute,
  });

  // Fetch unassigned jobs for the week
  const { data: unassignedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['power-washing-unassigned-jobs', selectedDate],
    queryFn: async () => {
      // Get jobs for the week
      const { data: jobs, error: jobsError } = await supabase
        .from('power_washing_jobs')
        .select(`
          id, job_number, property_address, scheduled_date, scheduled_time_start, 
          status, assigned_crew, property_latitude, property_longitude,
          customer:customers(id, first_name, last_name, company)
        `)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .in('status', ['pending', 'scheduled', 'in_progress']);
      
      if (jobsError) throw jobsError;

      // Get jobs already assigned to route stops
      const { data: stops, error: stopsError } = await supabase
        .from('power_washing_route_stops')
        .select('job_id');
      
      if (stopsError) throw stopsError;

      const assignedJobIds = new Set(stops?.map(s => s.job_id).filter(Boolean) || []);
      
      // Filter to unassigned jobs
      return (jobs || []).filter(j => !assignedJobIds.has(j.id)) as UnassignedJob[];
    },
  });

  // Fetch Mapbox token
  const { data: mapboxToken } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) return null;
      return data?.token || null;
    },
  });

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!shopData?.id) {
        throw new Error('Shop data not available');
      }

      const { data, error } = await supabase
        .from('power_washing_routes')
        .insert({
          shop_id: shopData.id,
          route_date: date,
          route_name: `Route ${format(new Date(date), 'MMM d')}`,
          status: 'planned',
          start_location: shopData?.address || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, assigned_crew: [] } as RouteData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-routes'] });
      toast.success('Route created successfully');
      setSelectedRoute(data);
    },
    onError: (error) => {
      toast.error('Failed to create route');
      console.error(error);
    },
  });

  // Update route status mutation
  const updateRouteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('power_washing_routes')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-routes'] });
      toast.success('Route status updated');
    },
  });

  // Add job to route mutation
  const addJobToRoute = useMutation({
    mutationFn: async (jobId: string) => {
      if (!shopData?.id) {
        throw new Error('Shop data not available. Please refresh the page.');
      }

      let routeId = selectedRoute?.id;
      
      if (!routeId) {
        // Create a new route first
        const newRoute = await createRouteMutation.mutateAsync(selectedDate);
        routeId = newRoute.id;
      }

      // Get current stop count
      const { data: existingStops } = await supabase
        .from('power_washing_route_stops')
        .select('id')
        .eq('route_id', routeId);

      const nextOrder = (existingStops?.length || 0) + 1;

      // Add stop
      const { error } = await supabase
        .from('power_washing_route_stops')
        .insert({
          route_id: routeId,
          job_id: jobId,
          stop_order: nextOrder,
          status: 'pending',
        });
      
      if (error) throw error;

      // Update route job count
      await supabase
        .from('power_washing_routes')
        .update({ total_jobs: nextOrder })
        .eq('id', routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-unassigned-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-routes'] });
      toast.success('Job added to route');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add job to route');
      console.error(error);
    },
  });

  // Optimize route handler
  const handleOptimizeRoute = async () => {
    if (!selectedRoute || routeStops.length < 2) {
      toast.error('Need at least 2 stops to optimize');
      return;
    }

    const origin: [number, number] = shopData?.longitude && shopData?.latitude 
      ? [shopData.longitude, shopData.latitude] 
      : routeStops[0].job?.property_longitude && routeStops[0].job?.property_latitude
        ? [routeStops[0].job.property_longitude, routeStops[0].job.property_latitude]
        : [-124.9, 49.7];

    const destinations: Location[] = routeStops
      .filter(s => s.job?.property_latitude && s.job?.property_longitude)
      .map(s => ({
        id: s.id,
        address: s.job?.property_address || '',
        coordinates: [s.job!.property_longitude!, s.job!.property_latitude!] as [number, number],
        name: s.job?.job_number || `Stop ${s.stop_order}`,
      }));

    try {
      const result = await routeOptimization.mutateAsync({
        origin,
        destinations,
        returnToOrigin: true,
      });

      // Update route with optimized data
      await supabase
        .from('power_washing_routes')
        .update({
          total_distance_miles: result.optimizedRoute.distanceMiles,
          estimated_duration_minutes: result.optimizedRoute.durationMinutes,
        })
        .eq('id', selectedRoute.id);

      // Update stop orders based on optimization
      for (let i = 0; i < result.optimizedOrder.length; i++) {
        const stop = result.optimizedOrder[i];
        const leg = result.legs[i];
        
        await supabase
          .from('power_washing_route_stops')
          .update({ 
            stop_order: i + 1,
            drive_time_minutes: leg?.durationMinutes,
            distance_from_previous_miles: leg?.distanceMiles,
          })
          .eq('id', stop.id);
      }

      queryClient.invalidateQueries({ queryKey: ['power-washing-route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-routes'] });
      toast.success(`Route optimized! ${result.optimizedRoute.distanceMiles} miles, ${result.optimizedRoute.durationMinutes} min`);
    } catch (error) {
      console.error('Optimization failed:', error);
      toast.error('Failed to optimize route');
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
      dayNum: format(date, 'd'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    };
  });

  // Filter routes by selected driver
  const filteredRoutes = useMemo(() => {
    if (selectedDriver === 'all') return routes;
    return routes.filter(route => {
      const crew = route.assigned_crew || [];
      return crew.some((member: any) => 
        member.id === selectedDriver || member.profile_id === selectedDriver
      );
    });
  }, [routes, selectedDriver]);

  // Routes for selected date
  const routesForDate = filteredRoutes.filter(r => r.route_date === selectedDate);

  // Get driver display name
  const getDriverName = (route: RouteData) => {
    const crew = route.assigned_crew || [];
    if (crew.length === 0) return 'Unassigned';
    const first = crew[0];
    return first.name || `${first.first_name || ''} ${first.last_name || ''}`.trim() || 'Crew';
  };

  const getDriverInitials = (route: RouteData) => {
    const name = getDriverName(route);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CR';
  };

  // Shop location for map
  const shopLocation = shopData?.latitude && shopData?.longitude ? {
    lat: shopData.latitude,
    lng: shopData.longitude,
    address: shopData.address || 'Shop'
  } : undefined;

  // Transform route stops for map/card display
  const transformedStops = routeStops.map(s => ({
    id: s.id,
    stop_order: s.stop_order,
    job_id: s.job_id,
    location_address: s.job?.property_address || '',
    latitude: s.job?.property_latitude ?? undefined,
    longitude: s.job?.property_longitude ?? undefined,
    estimated_arrival: s.estimated_arrival,
    actual_arrival: s.actual_arrival,
    status: s.status,
    travel_time_minutes: s.drive_time_minutes ?? undefined,
    travel_distance_miles: s.distance_from_previous_miles ?? undefined,
    job: s.job ? {
      id: s.job.id,
      job_number: s.job.job_number,
      status: s.job.status || 'pending',
      customer: s.job.customer,
    } : null,
  }));

  // Transform unassigned jobs for list display
  const transformedUnassignedJobs = unassignedJobs.map(j => ({
    id: j.id,
    job_number: j.job_number,
    property_address: j.property_address,
    scheduled_date: j.scheduled_date || '',
    scheduled_time: j.scheduled_time_start,
    status: j.status || 'pending',
    assigned_crew: j.assigned_crew,
    customer: j.customer,
  }));

  const isLoading = routesLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Navigation className="h-8 w-8 text-indigo-500" />
              Route Planning
            </h1>
            <p className="text-muted-foreground mt-1">
              Optimize your daily job routes for maximum efficiency
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DriverFilterDropdown
              selectedDriver={selectedDriver}
              onDriverChange={setSelectedDriver}
              teamMembers={teamMembers}
              isLoading={teamLoading}
            />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map((day) => {
          const dayRoutes = filteredRoutes.filter(r => r.route_date === day.date);
          const dayJobs = unassignedJobs.filter(j => j.scheduled_date === day.date);
          
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
                {dayRoutes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {dayRoutes.length}r
                  </Badge>
                )}
                {dayJobs.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-500">
                    {dayJobs.length}j
                  </Badge>
                )}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Professional Split-View Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Driver Route Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Driver Routes
            </h3>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => createRouteMutation.mutate(selectedDate)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Route
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : routesForDate.length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {routesForDate.map((route) => (
                <div 
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`cursor-pointer transition-all ${
                    selectedRoute?.id === route.id ? 'ring-2 ring-primary rounded-lg' : ''
                  }`}
                >
                  <DriverRouteCard
                    driverName={getDriverName(route)}
                    driverInitials={getDriverInitials(route)}
                    route={route}
                    stops={selectedRoute?.id === route.id ? transformedStops : []}
                    shopLocation={shopData?.address || 'Shop'}
                    onStartRoute={() => updateRouteStatus.mutate({ id: route.id, status: 'in_progress' })}
                    onOptimizeRoute={selectedRoute?.id === route.id ? handleOptimizeRoute : undefined}
                    onStopClick={(stop) => {
                      if (stop.job_id) {
                        navigate(`/power-washing/jobs/${stop.job_id}`);
                      }
                    }}
                    isOptimizing={routeOptimization.isPending}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/30">
              <CardContent className="p-8 text-center">
                <Navigation className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h4 className="font-semibold mb-1">No Routes for {format(new Date(selectedDate), 'MMM d')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a route to organize your jobs
                </p>
                <Button onClick={() => createRouteMutation.mutate(selectedDate)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Route
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Map View & Route Summary */}
        <div className="lg:col-span-7 space-y-4">
          <RouteMapView
            stops={transformedStops}
            shopLocation={shopLocation}
            mapboxToken={mapboxToken}
            optimizedRoute={routeOptimization.data?.optimizedRoute}
            onStopClick={(stop) => {
              const fullStop = routeStops.find(s => s.id === stop.id);
              if (fullStop?.job_id) {
                navigate(`/power-washing/jobs/${fullStop.job_id}`);
              }
            }}
            isOptimizing={routeOptimization.isPending}
            className="lg:sticky lg:top-6"
          />

          {/* Route Summary Stats */}
          {selectedRoute && (
            <Card className="border-border bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{transformedStops.length}</p>
                    <p className="text-xs text-muted-foreground">Stops</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {selectedRoute.total_distance_miles?.toFixed(1) || '—'}
                    </p>
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
                    }>
                      {selectedRoute.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Unassigned Jobs Section - Full Width at Bottom */}
      <div className="mt-6">
        <UnassignedJobsList
          jobs={transformedUnassignedJobs}
          selectedDate={selectedDate}
          onAddToRoute={(jobId) => addJobToRoute.mutate(jobId)}
          isLoading={jobsLoading}
          isAddingToRoute={addJobToRoute.isPending || createRouteMutation.isPending || !shopData?.id}
        />
      </div>
    </div>
  );
}
