import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, MapPin, Clock, CheckCircle2, AlertCircle, 
  Navigation, Fuel, User, Droplets, Route, Calendar,
  ChevronRight, Play, ArrowLeft, Timer, AlertTriangle
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInMinutes, isBefore } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCreateFuelDeliveryCompletion } from "@/hooks/useFuelDelivery";
import { LiveClock } from "@/components/fuel-delivery/LiveClock";
import { DeliveryTimeStats } from "@/components/fuel-delivery/DeliveryTimeStats";
import { DeliveryCompletionDialog } from "@/components/fuel-delivery/DeliveryCompletionDialog";
import { SkipStopDialog, SkipData, NavigationMapDialog } from "@/components/fuel-delivery";
import { ElapsedTimer } from "@/components/fuel-delivery/ElapsedTimer";
import { useFuelUnits } from "@/hooks/fuel-delivery/useFuelUnits";

// Types
interface RouteStop {
  id: string;
  route_id: string;
  customer_id?: string;
  order_id?: string;
  stop_sequence: number;
  status: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  actual_departure?: string;
  notes?: string;
  skip_reason?: string;
  preferred_time_window?: string;
  estimated_duration_minutes?: number;
  fuel_delivery_customers?: {
    company_name?: string;
    contact_name: string;
    phone?: string;
    billing_address?: string;
    billing_latitude?: number;
    billing_longitude?: number;
  };
  fuel_delivery_orders?: {
    order_number: string;
    quantity_ordered: number;
    special_instructions?: string;
    fuel_delivery_products?: {
      product_name: string;
      fuel_type: string;
    };
    fuel_delivery_locations?: {
      location_name: string;
      address: string;
      fuel_type: string;
      tank_capacity_gallons?: number;
      current_level_gallons?: number;
    };
  };
}

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
  total_gallons_planned?: number;
  total_gallons_delivered?: number;
  notes?: string;
  fuel_delivery_drivers?: {
    first_name: string;
    last_name: string;
  };
  fuel_delivery_trucks?: {
    truck_number: string;
  };
  stops?: RouteStop[];
}

// Custom hook for driver routes
function useDriverRoutes() {
  return useQuery({
    queryKey: ['driver-routes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_routes')
        .select(`
          *,
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .order('route_date', { ascending: true });
      if (error) throw error;
      return data as DeliveryRoute[];
    }
  });
}

// Hook for route stops
function useRouteStops(routeId: string | null) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    queryFn: async () => {
      if (!routeId) return [];
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_route_stops')
        .select(`
          *,
          fuel_delivery_customers(company_name, contact_name, phone, billing_address, billing_latitude, billing_longitude),
          fuel_delivery_orders(
            order_number, 
            quantity_ordered, 
            special_instructions,
            fuel_delivery_products(product_name, fuel_type),
            fuel_delivery_locations(location_name, address, fuel_type, tank_capacity_gallons, current_level_gallons)
          )
        `)
        .eq('route_id', routeId)
        .order('stop_sequence', { ascending: true });
      if (error) throw error;
      return data as RouteStop[];
    },
    enabled: !!routeId
  });
}

// Hook to update route stop status
function useUpdateRouteStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      status?: string; 
      actual_arrival?: string; 
      actual_departure?: string; 
      notes?: string; 
      skip_reason?: string;
      skip_action?: string;
      reschedule_date?: string;
      skip_notes?: string;
      stop_sequence?: number;
    }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_route_stops')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-stops'] });
      queryClient.invalidateQueries({ queryKey: ['driver-routes'] });
    }
  });
}

// Hook to update route status
function useUpdateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; start_time?: string; end_time?: string; completed_stops?: number }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_routes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-routes'] });
    }
  });
}

export default function FuelDeliveryDriverApp() {
  const navigate = useNavigate();
  const { data: routes, isLoading } = useDriverRoutes();
  const updateRoute = useUpdateRoute();
  const updateRouteStop = useUpdateRouteStop();
  const createCompletion = useCreateFuelDeliveryCompletion();
  const { formatVolume, getVolumeLabel } = useFuelUnits();
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [completionDialog, setCompletionDialog] = useState(false);
  const [skipDialog, setSkipDialog] = useState(false);
  const [navigationDialog, setNavigationDialog] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [completionData, setCompletionData] = useState({
    gallons_delivered: "",
    delivery_notes: "",
    tank_level_before: "",
    tank_level_after: ""
  });

  const { data: routeStops } = useRouteStops(selectedRoute?.id || null);

  // Filter routes based on time period
  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    
    // For 'all', return all non-completed routes first, then completed
    if (timeFilter === 'all') {
      return routes
        .filter(r => r.status !== 'completed')
        .concat(routes.filter(r => r.status === 'completed').slice(0, 5));
    }
    
    const now = new Date();
    let start: Date, end: Date;
    
    switch (timeFilter) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }
    
    return routes.filter(route => {
      const routeDate = parseISO(route.route_date);
      return isWithinInterval(routeDate, { start, end });
    });
  }, [routes, timeFilter]);

  // Stats
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

  const handleArriveAtStop = async (stop: RouteStop) => {
    await updateRouteStop.mutateAsync({
      id: stop.id,
      status: 'arrived',
      actual_arrival: new Date().toISOString()
    });
    toast.success("Arrived at stop");
  };

  const handleCompleteStop = async (data: {
    gallonsDelivered: number;
    productId: string | null;
    compartmentId: string | null;
    customProductName: string | null;
    meterStart: number | null;
    meterEnd: number | null;
    tankBefore: number;
    tankAfter: number;
    signature: string | null;
    customerPresent: boolean;
    notes: string;
    arrivalTime: string;
    departureTime: string;
  }) => {
    if (!selectedStop) return;

    await createCompletion.mutateAsync({
      gallons_delivered: data.gallonsDelivered,
      notes: data.notes,
      tank_level_before: data.tankBefore || undefined,
      tank_level_after: data.tankAfter || undefined,
      delivery_date: new Date().toISOString()
    });

    await updateRouteStop.mutateAsync({
      id: selectedStop.id,
      status: 'completed',
      notes: data.notes,
      actual_departure: data.departureTime
    });

    if (selectedRoute) {
      await updateRoute.mutateAsync({
        id: selectedRoute.id,
        completed_stops: (selectedRoute.completed_stops || 0) + 1
      });
    }

    setCompletionDialog(false);
    setSelectedStop(null);
    setCompletionData({
      gallons_delivered: "",
      delivery_notes: "",
      tank_level_before: "",
      tank_level_after: ""
    });
    toast.success("Stop completed!");
  };

  const handleSkipStop = async (stop: RouteStop, skipData: SkipData) => {
    setSkipLoading(true);
    try {
      const reasonText = skipData.reason === 'other' 
        ? skipData.customReason || 'Other' 
        : SKIP_REASON_LABELS[skipData.reason] || skipData.reason;

      // Handle different skip actions
      if (skipData.action === 'retry_later' && routeStops) {
        // Move to end of route sequence
        const maxSequence = Math.max(...routeStops.map(s => s.stop_sequence));
        await updateRouteStop.mutateAsync({
          id: stop.id,
          status: 'pending',
          skip_reason: reasonText,
          skip_action: skipData.action,
          skip_notes: skipData.notes,
          stop_sequence: maxSequence + 1,
          actual_departure: new Date().toISOString()
        });
        toast.info("Stop moved to end of route for retry");
      } else {
        // Standard skip (reschedule, cancel, or skip_only)
        await updateRouteStop.mutateAsync({
          id: stop.id,
          status: skipData.action === 'cancel' ? 'cancelled' : 'skipped',
          skip_reason: reasonText,
          skip_action: skipData.action,
          skip_notes: skipData.notes,
          reschedule_date: skipData.rescheduleDate,
          actual_departure: new Date().toISOString()
        });

        if (skipData.action === 'reschedule') {
          toast.info(`Stop rescheduled to ${skipData.rescheduleDate}`);
        } else if (skipData.action === 'cancel') {
          toast.warning("Order cancelled");
        } else {
          toast.info("Stop skipped");
        }
      }

      setSkipDialog(false);
      setSelectedStop(null);
    } catch (error) {
      console.error('Error skipping stop:', error);
      toast.error("Failed to skip stop");
    } finally {
      setSkipLoading(false);
    }
  };

  // Labels for skip reasons
  const SKIP_REASON_LABELS: Record<string, string> = {
    customer_not_available: 'Customer not available',
    no_access: 'No access to tank',
    weather: 'Weather conditions',
    customer_requested: 'Customer requested skip',
    wrong_address: 'Wrong address / Cannot locate',
    safety_concern: 'Safety concern',
    truck_issue: 'Truck / Equipment issue',
  };

  // Helper to get ETA status for a stop
  const getEtaStatus = (stop: RouteStop): { label: string; color: string; isLate: boolean } => {
    if (!stop.estimated_arrival) {
      return { label: 'No ETA', color: 'text-muted-foreground', isLate: false };
    }
    
    const now = new Date();
    const eta = parseISO(stop.estimated_arrival);
    const diff = differenceInMinutes(eta, now);
    
    if (stop.status === 'completed' || stop.status === 'skipped') {
      if (stop.actual_arrival) {
        const arrivalDiff = differenceInMinutes(parseISO(stop.actual_arrival), eta);
        if (arrivalDiff > 15) {
          return { label: `${arrivalDiff}min late`, color: 'text-red-500', isLate: true };
        }
        return { label: 'On time', color: 'text-green-500', isLate: false };
      }
      return { label: 'Done', color: 'text-green-500', isLate: false };
    }
    
    if (diff < -15) {
      return { label: `${Math.abs(diff)}min overdue`, color: 'text-red-500', isLate: true };
    } else if (diff < 0) {
      return { label: 'Due now', color: 'text-orange-500', isLate: false };
    } else if (diff <= 30) {
      return { label: `In ${diff}min`, color: 'text-yellow-500', isLate: false };
    }
    return { label: format(eta, 'h:mm a'), color: 'text-muted-foreground', isLate: false };
  };

  // Get time window label
  const getTimeWindowLabel = (window?: string): string => {
    switch (window) {
      case 'morning': return '8AM-12PM';
      case 'afternoon': return '12PM-5PM';
      case 'evening': return '5PM-8PM';
      default: return 'Any time';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'arrived': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'skipped': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Route Detail View
  if (selectedRoute) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
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
            <LiveClock className="text-primary-foreground opacity-90" />
            <Badge variant="secondary" className={getStatusColor(selectedRoute.status)}>
              {selectedRoute.status}
            </Badge>
          </div>
        </div>

        {/* Route Progress */}
        <div className="p-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedRoute.fuel_delivery_trucks?.truck_number || 'No truck assigned'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {routeStops?.filter(s => s.status === 'completed').length || 0} / {routeStops?.length || 0} stops
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${routeStops?.length ? (routeStops.filter(s => s.status === 'completed').length / routeStops.length) * 100 : 0}%` 
                  }}
                />
              </div>
              
              {selectedRoute.status === 'planned' && (
                <Button 
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                  onClick={() => handleStartRoute(selectedRoute)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Route
                </Button>
              )}
              
              {selectedRoute.status === 'in_progress' && routeStops?.every(s => s.status === 'completed' || s.status === 'skipped') && (
                <Button 
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                  onClick={() => handleCompleteRoute(selectedRoute)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Route
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stops List */}
        <div className="px-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Delivery Stops
          </h2>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3">
              {!routeStops || routeStops.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No stops on this route</p>
                  </CardContent>
                </Card>
              ) : (
                routeStops.map((stop, index) => (
                  <Card key={stop.id} className={`overflow-hidden ${stop.status === 'completed' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium truncate">
                                {stop.fuel_delivery_customers?.company_name || 
                                 stop.fuel_delivery_customers?.contact_name || 
                                 stop.fuel_delivery_orders?.fuel_delivery_locations?.location_name ||
                                 'Unknown Stop'}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {stop.fuel_delivery_orders?.fuel_delivery_locations?.address || 
                                 stop.fuel_delivery_customers?.billing_address || 
                                 'No address'}
                              </p>
                            </div>
                            <Badge className={`shrink-0 ${getStatusColor(stop.status)}`}>
                              {stop.status}
                            </Badge>
                          </div>
                          
                          {/* ETA and Time Window */}
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            {stop.preferred_time_window && stop.preferred_time_window !== 'any' && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Timer className="h-3 w-3" />
                                {getTimeWindowLabel(stop.preferred_time_window)}
                              </span>
                            )}
                            {stop.estimated_arrival && (
                              <span className={`flex items-center gap-1 ${getEtaStatus(stop).color}`}>
                                {getEtaStatus(stop).isLate && <AlertTriangle className="h-3 w-3" />}
                                {getEtaStatus(stop).label}
                              </span>
                            )}
                          </div>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Fuel className="h-3 w-3 text-orange-500" />
                                {stop.fuel_delivery_orders?.fuel_delivery_locations?.fuel_type || 
                                 stop.fuel_delivery_orders?.fuel_delivery_products?.fuel_type || 'Fuel'}
                              </span>
                              {stop.fuel_delivery_orders?.fuel_delivery_locations?.tank_capacity_gallons && (
                                <span className="text-muted-foreground">
                                  Tank: {formatVolume(stop.fuel_delivery_orders.fuel_delivery_locations.tank_capacity_gallons, 0)}
                                </span>
                              )}
                              {stop.fuel_delivery_orders?.quantity_ordered && (
                                <span className="text-muted-foreground">
                                  Order: {formatVolume(stop.fuel_delivery_orders.quantity_ordered, 0)}
                                </span>
                              )}
                            </div>
                          
                          {stop.status === 'pending' && selectedRoute.status === 'in_progress' && (
                            <div className="flex gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedStop(stop);
                                  setNavigationDialog(true);
                                }}
                              >
                                <Navigation className="h-3 w-3 mr-1" />
                                Navigate
                              </Button>
                              <Button 
                                size="sm"
                                className="flex-1"
                                onClick={() => handleArriveAtStop(stop)}
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                Arrived
                              </Button>
                            </div>
                          )}
                          
                          {stop.status === 'arrived' && (
                            <div className="mt-3 space-y-2">
                              {/* Elapsed timer banner */}
                              <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                  On-site time
                                </span>
                                {stop.actual_arrival && (
                                  <ElapsedTimer 
                                    startTime={stop.actual_arrival} 
                                    className="text-sm font-bold text-purple-600 dark:text-purple-400"
                                  />
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedStop(stop);
                                    setSkipDialog(true);
                                  }}
                                >
                                  Skip
                                </Button>
                                <Button 
                                  size="sm"
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedStop(stop);
                                    setCompletionDialog(true);
                                  }}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete Delivery
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {(stop.status === 'skipped' || stop.status === 'cancelled') && selectedRoute.status === 'in_progress' && (
                            <div className="mt-3 space-y-2">
                              {stop.skip_reason && (
                                <p className="text-xs text-muted-foreground italic">
                                  Skipped: {stop.skip_reason}
                                </p>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                  await updateRouteStop.mutateAsync({
                                    id: stop.id,
                                    status: 'pending',
                                    skip_reason: undefined,
                                    skip_action: undefined,
                                    skip_notes: undefined,
                                    reschedule_date: undefined,
                                  });
                                  toast.success("Stop reactivated");
                                }}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Reactivate Stop
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced Completion Dialog */}
        <DeliveryCompletionDialog
          open={completionDialog}
          onOpenChange={setCompletionDialog}
          stop={selectedStop}
          route={selectedRoute}
          onComplete={handleCompleteStop}
        />

        {/* Skip Stop Dialog */}
        <SkipStopDialog
          open={skipDialog}
          onOpenChange={setSkipDialog}
          stop={selectedStop}
          onSkip={(data) => selectedStop && handleSkipStop(selectedStop, data)}
          isLoading={skipLoading}
        />

        {/* Navigation Map Dialog */}
        <NavigationMapDialog
          open={navigationDialog}
          onOpenChange={setNavigationDialog}
          stop={selectedStop ? {
            id: selectedStop.id,
            address: selectedStop.fuel_delivery_orders?.fuel_delivery_locations?.address || 
                     selectedStop.fuel_delivery_customers?.billing_address,
            latitude: selectedStop.fuel_delivery_customers?.billing_latitude,
            longitude: selectedStop.fuel_delivery_customers?.billing_longitude,
            customerName: selectedStop.fuel_delivery_customers?.company_name || 
                          selectedStop.fuel_delivery_customers?.contact_name,
            phone: selectedStop.fuel_delivery_customers?.phone,
            fuelType: selectedStop.fuel_delivery_orders?.fuel_delivery_locations?.fuel_type ||
                      selectedStop.fuel_delivery_orders?.fuel_delivery_products?.fuel_type,
            quantity: selectedStop.fuel_delivery_orders?.quantity_ordered,
          } : null}
          onArrived={() => {
            if (selectedStop) {
              handleArriveAtStop(selectedStop);
              setNavigationDialog(false);
            }
          }}
        />
      </div>
    );
  }

  // Main Routes List View
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6" />
            <span className="font-bold text-lg">Driver App</span>
          </div>
          <Badge variant="secondary" className="text-sm">
            {format(new Date(), 'MMM d, yyyy')}
          </Badge>
        </div>
      </div>

      {/* Time Filter Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'all' | 'today' | 'week' | 'month')}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.planned}</div>
            <div className="text-xs text-muted-foreground">Planned</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Routes List */}
      <div className="px-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Route className="h-4 w-4" />
          {timeFilter === 'today' ? "Today's Routes" : timeFilter === 'week' ? "This Week's Routes" : "This Month's Routes"}
        </h2>
        
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-3">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <div className="animate-pulse">Loading routes...</div>
                </CardContent>
              </Card>
            ) : filteredRoutes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No routes scheduled</p>
                  <p className="text-sm mt-1">Check back later or contact dispatch</p>
                </CardContent>
              </Card>
            ) : (
              filteredRoutes.map((route) => (
                <Card 
                  key={route.id} 
                  className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedRoute(route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{route.route_name}</h3>
                          <Badge className={getStatusColor(route.status)}>
                            {route.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(route.route_date), 'EEE, MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {route.total_stops || 0} stops
                          </span>
                        </div>
                        {route.fuel_delivery_trucks && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Truck className="h-3 w-3" />
                            {route.fuel_delivery_trucks.truck_number}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                    
                    {route.total_stops > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{route.completed_stops || 0} / {route.total_stops}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ 
                              width: `${route.total_stops ? ((route.completed_stops || 0) / route.total_stops) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
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
