import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { RouteCalendarEventData } from '@/components/water-delivery/RouteCalendarEvent';

interface UseWaterRouteCalendarEventsProps {
  viewDate: Date;
  viewMode: 'day' | 'week' | 'month';
  priorityFilter?: 'all' | 'emergency' | 'high' | 'normal' | 'low';
}

export function useWaterRouteCalendarEvents({
  viewDate,
  viewMode,
  priorityFilter = 'all',
}: UseWaterRouteCalendarEventsProps) {
  const { shopId } = useShopId();

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: format(viewDate, 'yyyy-MM-dd'),
          end: format(viewDate, 'yyyy-MM-dd'),
        };
      case 'week':
        return {
          start: format(startOfWeek(viewDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(viewDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        };
      case 'month':
      default:
        // Include weeks that overlap with the month
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        return {
          start: format(startOfWeek(monthStart, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(monthEnd, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        };
    }
  };

  const { start, end } = getDateRange();

  const { data: routes, isLoading, error, refetch } = useQuery({
    queryKey: ['water-route-calendar-events', shopId, start, end, priorityFilter],
    queryFn: async () => {
      if (!shopId) return [];

      let query = supabase
        .from('water_delivery_routes')
        .select(`
          id,
          route_name,
          route_date,
          status,
          priority,
          total_stops,
          notes,
          start_time,
          end_time,
          water_delivery_drivers (first_name, last_name),
          water_delivery_trucks (truck_number)
        `)
        .eq('shop_id', shopId)
        .gte('route_date', start)
        .lte('route_date', end)
        .order('route_date', { ascending: true });

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data: routesData, error: routesError } = await query;
      if (routesError) throw routesError;

      // Fetch route stops to determine business vs residential
      const routeIds = routesData?.map(r => r.id) || [];
      
      let stopsData: any[] = [];
      if (routeIds.length > 0) {
        const { data: stops, error: stopsError } = await supabase
          .from('water_delivery_route_stops')
          .select(`
            route_id,
            water_delivery_customers (is_commercial)
          `)
          .in('route_id', routeIds);
        
        if (!stopsError) {
          stopsData = stops || [];
        }
      }

      // Group stops by route
      const stopsByRoute = stopsData.reduce((acc, stop) => {
        if (!acc[stop.route_id]) {
          acc[stop.route_id] = { business: 0, residential: 0 };
        }
        if (stop.water_delivery_customers?.is_commercial) {
          acc[stop.route_id].business++;
        } else {
          acc[stop.route_id].residential++;
        }
        return acc;
      }, {} as Record<string, { business: number; residential: number }>);

      // Transform to calendar events
      const events: RouteCalendarEventData[] = (routesData || []).map(route => {
        const routeStops = stopsByRoute[route.id] || { business: 0, residential: 0 };
        const driver = route.water_delivery_drivers;
        
        return {
          id: route.id,
          title: route.route_name || 'Unnamed Route',
          date: route.route_date,
          startTime: route.start_time ? format(parseISO(`2000-01-01T${route.start_time}`), 'h:mm a') : undefined,
          endTime: route.end_time ? format(parseISO(`2000-01-01T${route.end_time}`), 'h:mm a') : undefined,
          priority: (route.priority as 'emergency' | 'high' | 'normal' | 'low') || 'normal',
          status: (route.status as 'planned' | 'in_progress' | 'completed' | 'cancelled') || 'planned',
          driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
          truckNumber: route.water_delivery_trucks?.truck_number,
          totalStops: route.total_stops || routeStops.business + routeStops.residential,
          businessStops: routeStops.business,
          residentialStops: routeStops.residential,
          notes: route.notes,
        };
      });

      return events;
    },
    enabled: !!shopId,
  });

  // Group events by date for easy rendering
  const eventsByDate = (routes || []).reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, RouteCalendarEventData[]>);

  return {
    events: routes || [],
    eventsByDate,
    isLoading,
    error,
    refetch,
  };
}
