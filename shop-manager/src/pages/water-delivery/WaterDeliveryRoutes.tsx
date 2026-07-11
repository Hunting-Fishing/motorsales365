import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ArrowLeft, Route, MapPin, Calendar, Map, List, CalendarDays, CalendarRange } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { WaterDeliveryRouteMap } from '@/components/water-delivery/WaterDeliveryRouteMap';
import { Location } from '@/hooks/useMapbox';
import { CreateRouteDialog } from '@/components/water-delivery/CreateRouteDialog';
import { WaterDeliveryRouteCalendar, CalendarViewMode } from '@/components/water-delivery/WaterDeliveryRouteCalendar';
import { RouteCalendarEventData } from '@/components/water-delivery/RouteCalendarEvent';

type ViewMode = 'list' | 'map' | 'day' | 'week' | 'month';

export default function WaterDeliveryRoutes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState<Date | undefined>();
  const { shopId } = useShopId();

  // Fetch routes
  const { data: routes, isLoading } = useQuery({
    queryKey: ['water-delivery-routes', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_routes')
        .select(`
          *,
          water_delivery_drivers (first_name, last_name),
          water_delivery_trucks (truck_number)
        `)
        .eq('shop_id', shopId)
        .order('route_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch delivery locations with coordinates for mapping
  const { data: deliveryLocations } = useQuery({
    queryKey: ['water-delivery-locations-with-coords', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_locations')
        .select('id, location_name, address, city, state, latitude, longitude, customer_id')
        .eq('shop_id', shopId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredRoutes = routes?.filter(route => 
    route.route_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Convert locations to map destinations
  const mapDestinations: Location[] = useMemo(() => {
    if (!deliveryLocations) return [];
    
    return deliveryLocations.map((loc, index) => ({
      id: loc.id,
      address: [loc.address, loc.city, loc.state].filter(Boolean).join(', '),
      coordinates: [loc.longitude!, loc.latitude!] as [number, number],
      name: loc.location_name || `Location ${index + 1}`,
      priority: 'normal' as const,
    }));
  }, [deliveryLocations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'planned': return <Badge variant="outline">Planned</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'emergency': return <Badge className="bg-red-500 animate-pulse">Emergency</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'normal': return <Badge className="bg-cyan-500">Normal</Badge>;
      case 'low': return <Badge className="bg-gray-400">Low</Badge>;
      default: return <Badge className="bg-cyan-500">Normal</Badge>;
    }
  };

  const handleCreateRoute = (date?: Date) => {
    setCreateDialogDate(date);
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: RouteCalendarEventData) => {
    // TODO: Open route details dialog
    console.log('Event clicked:', event);
  };

  const isCalendarView = viewMode === 'day' || viewMode === 'week' || viewMode === 'month';

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Route className="h-8 w-8 text-cyan-600" />
              Delivery Routes
            </h1>
            <p className="text-muted-foreground mt-1">
              Plan and optimize water delivery routes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  <span className="hidden sm:inline">Map</span>
                </TabsTrigger>
                <TabsTrigger value="day" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Day</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Week</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  <span className="hidden sm:inline">Month</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {!isCalendarView && (
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => handleCreateRoute()}>
                <Plus className="h-4 w-4 mr-2" />
                New Route
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Create Route Dialog */}
      <CreateRouteDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        defaultDate={createDialogDate}
      />

      {/* Calendar Views */}
      {isCalendarView && (
        <WaterDeliveryRouteCalendar
          viewMode={viewMode as CalendarViewMode}
          onViewModeChange={(mode) => setViewMode(mode)}
          onCreateRoute={handleCreateRoute}
          onEventClick={handleEventClick}
        />
      )}

      {/* Search - only for list view */}
      {viewMode === 'list' && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search routes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Content */}
      {viewMode === 'map' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="h-5 w-5 text-cyan-600" />
              Delivery Locations Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WaterDeliveryRouteMap
              destinations={mapDestinations}
              height="500px"
              showOptimizeButton={mapDestinations.length > 1}
              shopId={shopId}
            />
            {mapDestinations.length === 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No delivery locations with coordinates found. Add locations with addresses to see them on the map.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRoutes && filteredRoutes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Truck</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((route) => (
                    <TableRow key={route.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{route.route_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {route.route_date 
                            ? format(new Date(route.route_date), 'MMM d, yyyy')
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(route.priority)}</TableCell>
                      <TableCell>
                        {route.water_delivery_drivers 
                          ? `${route.water_delivery_drivers.first_name} ${route.water_delivery_drivers.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{route.water_delivery_trucks?.truck_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {route.total_stops || 0}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(route.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No routes found</p>
                <Button variant="link" onClick={() => handleCreateRoute()}>
                  Create your first route
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
