import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, MapPin, Clock, CheckCircle2, 
  Navigation, Droplets, User, Route, Calendar,
  ChevronRight, Play, ArrowLeft
} from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useWaterUnits } from "@/hooks/water-delivery/useWaterUnits";

interface DeliveryRoute {
  id: string;
  route_name: string;
  route_date: string;
  driver_id?: string;
  truck_id?: string;
  status: string;
  start_time?: string;
  end_time?: string;
  total_stops: number;
  completed_stops: number;
  delivered_gallons?: number;
  water_delivery_drivers?: {
    first_name: string;
    last_name: string;
  };
  water_delivery_trucks?: {
    truck_number: string;
  };
}

function useDriverRoutes() {
  return useQuery({
    queryKey: ['water-driver-routes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_routes')
        .select(`
          *,
          water_delivery_drivers(first_name, last_name),
          water_delivery_trucks(truck_number)
        `)
        .order('route_date', { ascending: true });
      if (error) throw error;
      return data as DeliveryRoute[];
    }
  });
}

function useUpdateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; start_time?: string; end_time?: string }) => {
      const { error } = await (supabase as any)
        .from('water_delivery_routes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-driver-routes'] });
    }
  });
}

export default function WaterDeliveryDriverApp() {
  const navigate = useNavigate();
  const { data: routes, isLoading } = useDriverRoutes();
  const updateRoute = useUpdateRoute();
  const { formatVolume, getVolumeLabel } = useWaterUnits();
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('today');
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    
    if (timeFilter === 'all') {
      return routes.filter(r => r.status !== 'completed').slice(0, 20);
    }
    
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);
    
    return routes.filter(route => {
      const routeDate = parseISO(route.route_date);
      return routeDate >= start && routeDate <= end;
    });
  }, [routes, timeFilter]);

  const stats = useMemo(() => {
    const planned = filteredRoutes.filter(r => r.status === 'planned').length;
    const inProgress = filteredRoutes.filter(r => r.status === 'in_progress').length;
    const completed = filteredRoutes.filter(r => r.status === 'completed').length;
    const totalStops = filteredRoutes.reduce((sum, r) => sum + (r.total_stops || 0), 0);
    const completedStops = filteredRoutes.reduce((sum, r) => sum + (r.completed_stops || 0), 0);
    
    return { planned, inProgress, completed, totalStops, completedStops };
  }, [filteredRoutes]);

  const handleStartRoute = async (route: DeliveryRoute) => {
    await updateRoute.mutateAsync({ 
      id: route.id, 
      status: 'in_progress',
      start_time: new Date().toISOString()
    });
    toast.success("Route started!");
    setSelectedRoute({ ...route, status: 'in_progress' });
  };

  const handleCompleteRoute = async (route: DeliveryRoute) => {
    await updateRoute.mutateAsync({ 
      id: route.id, 
      status: 'completed',
      end_time: new Date().toISOString()
    });
    toast.success("Route completed!");
    setSelectedRoute(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (selectedRoute) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-50 bg-cyan-600 text-white p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setSelectedRoute(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{selectedRoute.route_name}</h1>
              <p className="text-sm opacity-80">
                {format(parseISO(selectedRoute.route_date), 'EEEE, MMM d')}
              </p>
            </div>
            <Badge variant="secondary" className={getStatusColor(selectedRoute.status)}>
              {selectedRoute.status}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cyan-600" />
                  <span className="font-medium">
                    {selectedRoute.water_delivery_trucks?.truck_number || 'No truck assigned'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedRoute.completed_stops || 0} / {selectedRoute.total_stops || 0} stops
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${selectedRoute.total_stops ? (selectedRoute.completed_stops / selectedRoute.total_stops) * 100 : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            {selectedRoute.status === 'planned' && (
              <Button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                onClick={() => handleStartRoute(selectedRoute)}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Route
              </Button>
            )}
            {selectedRoute.status === 'in_progress' && (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleCompleteRoute(selectedRoute)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Route
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-600" />
                Water Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-cyan-600">
                {formatVolume(selectedRoute.delivered_gallons || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-cyan-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/water-delivery')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Driver App</h1>
              <p className="text-sm opacity-80">Water Delivery</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{format(new Date(), 'h:mm a')}</p>
            <p className="text-sm opacity-80">{format(new Date(), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto text-blue-500" />
              <p className="text-2xl font-bold">{stats.planned}</p>
              <p className="text-xs text-muted-foreground">Planned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Route className="h-5 w-5 mx-auto text-cyan-500" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto text-green-500" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading routes...</div>
            ) : filteredRoutes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Route className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No routes for this period</p>
                </CardContent>
              </Card>
            ) : (
              filteredRoutes.map((route) => (
                <Card 
                  key={route.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRoute(route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{route.route_name}</h3>
                          <Badge className={getStatusColor(route.status)}>
                            {route.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(parseISO(route.route_date), 'MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {route.total_stops || 0} stops
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            {route.water_delivery_trucks?.truck_number || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
