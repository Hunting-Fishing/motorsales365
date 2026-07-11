import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO } from 'date-fns';

export type EventType = 'route' | 'order';
export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'pending';
export type EventPriority = 'emergency' | 'high' | 'normal' | 'low';

export interface WaterDeliveryCalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: EventType;
  priority: EventPriority;
  status: EventStatus;
  driverId?: string;
  driverName?: string;
  truckId?: string;
  truckNumber?: string;
  customerId?: string;
  customerName?: string;
  locationName?: string;
  quantity?: number;
  totalStops?: number;
  notes?: string;
  color: string;
}

interface UseWaterDeliveryCalendarEventsProps {
  viewDate: Date;
  viewMode: 'day' | 'week' | 'month';
  driverFilter?: string[];
  truckFilter?: string[];
  typeFilter?: EventType[];
  statusFilter?: EventStatus[];
  priorityFilter?: EventPriority[];
}

const priorityColors = {
  emergency: '#EF4444',
  high: '#F97316',
  normal: '#3B82F6',
  low: '#9CA3AF',
};

const typeColors = {
  route: '#22C55E',
  order: '#3B82F6',
};

export function useWaterDeliveryCalendarEvents({
  viewDate,
  viewMode,
  driverFilter = [],
  truckFilter = [],
  typeFilter = [],
  statusFilter = [],
  priorityFilter = [],
}: UseWaterDeliveryCalendarEventsProps) {
  const { shopId } = useShopId();

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
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        return {
          start: format(startOfWeek(monthStart, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(monthEnd, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        };
    }
  };

  const { start, end } = getDateRange();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['water-delivery-calendar-events', shopId, start, end, driverFilter, truckFilter, typeFilter, statusFilter, priorityFilter],
    queryFn: async () => {
      if (!shopId) return { events: [], stats: { totalOrders: 0, totalGallons: 0, activeDrivers: 0, unassigned: 0 } };

      const events: WaterDeliveryCalendarEvent[] = [];
      const shouldFetchRoutes = typeFilter.length === 0 || typeFilter.includes('route');
      const shouldFetchOrders = typeFilter.length === 0 || typeFilter.includes('order');

      // Fetch routes
      if (shouldFetchRoutes) {
        let routesQuery = supabase
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
            driver_id,
            truck_id,
            water_delivery_drivers (id, first_name, last_name),
            water_delivery_trucks (id, truck_number)
          `)
          .eq('shop_id', shopId)
          .gte('route_date', start)
          .lte('route_date', end);

        if (driverFilter.length > 0) {
          routesQuery = routesQuery.in('driver_id', driverFilter);
        }
        if (truckFilter.length > 0) {
          routesQuery = routesQuery.in('truck_id', truckFilter);
        }

        const { data: routesData, error: routesError } = await routesQuery;
        if (routesError) throw routesError;

        (routesData || []).forEach(route => {
          const driver = route.water_delivery_drivers;
          const truck = route.water_delivery_trucks;
          const priority = (route.priority as EventPriority) || 'normal';
          
          // Map route status to our event status
          const statusMap: Record<string, EventStatus> = {
            'planned': 'scheduled',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
          };
          const status = statusMap[route.status] || 'scheduled';

          // Apply status filter
          if (statusFilter.length > 0 && !statusFilter.includes(status)) return;
          // Apply priority filter
          if (priorityFilter.length > 0 && !priorityFilter.includes(priority)) return;

          events.push({
            id: route.id,
            title: route.route_name || 'Unnamed Route',
            date: route.route_date,
            startTime: route.start_time ? format(parseISO(`2000-01-01T${route.start_time}`), 'h:mm a') : undefined,
            endTime: route.end_time ? format(parseISO(`2000-01-01T${route.end_time}`), 'h:mm a') : undefined,
            type: 'route',
            priority,
            status,
            driverId: route.driver_id || undefined,
            driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
            truckId: truck?.id,
            truckNumber: truck?.truck_number,
            totalStops: route.total_stops || 0,
            notes: route.notes,
            color: typeColors.route,
          });
        });
      }

      // Fetch orders
      if (shouldFetchOrders) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('water_delivery_orders')
          .select(`
            id,
            order_number,
            requested_date,
            status,
            priority,
            quantity_gallons,
            notes,
            assigned_driver_id,
            customer_id,
            location_id
          `)
          .eq('shop_id', shopId)
          .gte('requested_date', start)
          .lte('requested_date', end);

        if (ordersError) throw ordersError;

        // Fetch related data
        const customerIds = [...new Set((ordersData || []).map(o => o.customer_id).filter(Boolean))] as string[];
        const locationIds = [...new Set((ordersData || []).map(o => o.location_id).filter(Boolean))] as string[];
        const driverIds = [...new Set((ordersData || []).map(o => o.assigned_driver_id).filter(Boolean))] as string[];

        const [customersRes, locationsRes, driversRes] = await Promise.all([
          customerIds.length > 0 ? supabase.from('water_delivery_customers').select('id, name').in('id', customerIds) : { data: [] },
          locationIds.length > 0 ? supabase.from('water_delivery_locations').select('id, name').in('id', locationIds) : { data: [] },
          driverIds.length > 0 ? supabase.from('water_delivery_drivers').select('id, first_name, last_name').in('id', driverIds) : { data: [] },
        ]);

        const customersMap = new Map((customersRes.data || []).map(c => [c.id, c]));
        const locationsMap = new Map((locationsRes.data || []).map(l => [l.id, l]));
        const driversMap = new Map((driversRes.data || []).map(d => [d.id, d]));

        (ordersData || []).forEach(order => {
          // Apply driver filter
          if (driverFilter.length > 0 && order.assigned_driver_id && !driverFilter.includes(order.assigned_driver_id)) return;

          const driver = order.assigned_driver_id ? driversMap.get(order.assigned_driver_id) : null;
          const customer = order.customer_id ? customersMap.get(order.customer_id) : null;
          const location = order.location_id ? locationsMap.get(order.location_id) : null;
          const priority = (order.priority as EventPriority) || 'normal';
          
          const statusMap: Record<string, EventStatus> = {
            'pending': 'pending',
            'scheduled': 'scheduled',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'delivered': 'completed',
          };
          const status = statusMap[order.status] || 'pending';

          if (statusFilter.length > 0 && !statusFilter.includes(status)) return;
          if (priorityFilter.length > 0 && !priorityFilter.includes(priority)) return;

          const eventDate = order.requested_date;
          if (!eventDate) return;

          events.push({
            id: order.id,
            title: customer?.name || `Order #${order.order_number}`,
            date: eventDate,
            type: 'order',
            priority,
            status,
            driverId: order.assigned_driver_id || undefined,
            driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
            customerId: customer?.id,
            customerName: customer?.name,
            locationName: location?.name,
            quantity: order.quantity_gallons,
            notes: order.notes,
            color: priority === 'emergency' ? priorityColors.emergency : 
                   priority === 'high' ? priorityColors.high : typeColors.order,
          });
        });
      }

      // Calculate stats
      const orderEvents = events.filter(e => e.type === 'order');
      const totalOrders = orderEvents.length;
      const totalGallons = orderEvents.reduce((sum, e) => sum + (e.quantity || 0), 0);
      const activeDriverIds = new Set(events.filter(e => e.driverId).map(e => e.driverId));
      const activeDrivers = activeDriverIds.size;
      const unassigned = events.filter(e => !e.driverId).length;

      return {
        events: events.sort((a, b) => {
          // Sort by date, then by time
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          return 0;
        }),
        stats: { totalOrders, totalGallons, activeDrivers, unassigned },
      };
    },
    enabled: !!shopId,
  });

  // Group events by date
  const eventsByDate = (data?.events || []).reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, WaterDeliveryCalendarEvent[]>);

  return {
    events: data?.events || [],
    eventsByDate,
    stats: data?.stats || { totalOrders: 0, totalGallons: 0, activeDrivers: 0, unassigned: 0 },
    isLoading,
    error,
    refetch,
  };
}
