/**
 * Auto Route Generation Service
 * Automatically generates delivery routes based on customer/location delivery schedules
 */

import { supabase } from '@/integrations/supabase/client';
import { format, addDays, getDay, startOfDay, endOfDay } from 'date-fns';

interface ScheduledStop {
  customerId: string;
  locationId?: string;
  customerName: string;
  locationName?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  fuelType?: string;
  preferredTimeWindow?: string;
  estimatedServiceMinutes?: number;
}

interface GeneratedRoute {
  routeName: string;
  routeDate: string;
  stops: ScheduledStop[];
}

interface GenerationResult {
  routesCreated: number;
  stopsCreated: number;
  errors: string[];
}

/**
 * Get all customers/locations scheduled for delivery on a specific day of week
 */
export async function getScheduledDeliveriesForDay(
  shopId: string,
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
): Promise<ScheduledStop[]> {
  const stops: ScheduledStop[] = [];

  // Get locations with this day in their delivery_days
  const { data: locations, error: locError } = await supabase
    .from('fuel_delivery_locations')
    .select(`
      *,
      fuel_delivery_customers(id, contact_name, company_name)
    `)
    .eq('is_active', true)
    .contains('delivery_days', [dayOfWeek]);

  if (locError) {
    console.error('Error fetching scheduled locations:', locError);
  }

  if (locations) {
    for (const loc of locations) {
      const customer = loc.fuel_delivery_customers;
      stops.push({
        customerId: loc.customer_id,
        locationId: loc.id,
        customerName: customer?.company_name || customer?.contact_name || 'Unknown',
        locationName: loc.location_name,
        address: loc.address || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        fuelType: loc.fuel_type,
        preferredTimeWindow: loc.preferred_time_window || 'any',
        estimatedServiceMinutes: loc.estimated_service_minutes || 15,
      });
    }
  }

  // Get customers with this day in their delivery_days (who don't have locations)
  const { data: customers, error: custError } = await supabase
    .from('fuel_delivery_customers')
    .select('*')
    .eq('is_active', true)
    .contains('delivery_days', [dayOfWeek]);

  if (custError) {
    console.error('Error fetching scheduled customers:', custError);
  }

  if (customers) {
    const locationCustomerIds = new Set(stops.map(s => s.customerId));
    
    for (const cust of customers) {
      // Skip if already added via location
      if (locationCustomerIds.has(cust.id)) continue;
      
      // Only add if they have coordinates
      if (cust.billing_latitude && cust.billing_longitude) {
        stops.push({
          customerId: cust.id,
          customerName: cust.company_name || cust.contact_name || 'Unknown',
          address: cust.billing_address || '',
          latitude: cust.billing_latitude,
          longitude: cust.billing_longitude,
          fuelType: cust.preferred_fuel_type,
          preferredTimeWindow: cust.preferred_time_window || 'any',
          estimatedServiceMinutes: 15,
        });
      }
    }
  }

  return stops;
}

/**
 * Check if a route already exists for a specific date
 */
export async function routeExistsForDate(
  shopId: string,
  date: Date
): Promise<boolean> {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('fuel_delivery_routes')
    .select('id')
    .eq('shop_id', shopId)
    .eq('route_date', dateStr)
    .limit(1);

  if (error) {
    console.error('Error checking existing routes:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Generate routes for a specific date
 */
export async function generateRoutesForDate(
  shopId: string,
  date: Date,
  driverId?: string,
  truckId?: string,
  skipExisting: boolean = true
): Promise<GenerationResult> {
  const result: GenerationResult = {
    routesCreated: 0,
    stopsCreated: 0,
    errors: [],
  };

  // Check if route already exists
  if (skipExisting && await routeExistsForDate(shopId, date)) {
    result.errors.push(`Route already exists for ${format(date, 'yyyy-MM-dd')}`);
    return result;
  }

  const dayOfWeek = getDay(date);
  const stops = await getScheduledDeliveriesForDay(shopId, dayOfWeek);

  if (stops.length === 0) {
    result.errors.push(`No deliveries scheduled for ${format(date, 'EEEE')}`);
    return result;
  }

  // Sort stops by preferred time window
  const timeWindowOrder: Record<string, number> = {
    'morning': 1,
    'afternoon': 2,
    'evening': 3,
    'any': 4,
  };
  
  stops.sort((a, b) => {
    const aOrder = timeWindowOrder[a.preferredTimeWindow || 'any'] || 4;
    const bOrder = timeWindowOrder[b.preferredTimeWindow || 'any'] || 4;
    return aOrder - bOrder;
  });

  // Create the route
  const routeName = `${format(date, 'EEEE')} Deliveries - ${format(date, 'MMM d')}`;
  
  const { data: route, error: routeError } = await supabase
    .from('fuel_delivery_routes')
    .insert({
      shop_id: shopId,
      route_name: routeName,
      route_date: format(date, 'yyyy-MM-dd'),
      driver_id: driverId || null,
      truck_id: truckId || null,
      status: 'planned',
      total_stops: stops.length,
      completed_stops: 0,
    })
    .select()
    .single();

  if (routeError) {
    result.errors.push(`Failed to create route: ${routeError.message}`);
    return result;
  }

  result.routesCreated = 1;

  // Create route stops
  let estimatedTime = new Date(date);
  estimatedTime.setHours(8, 0, 0, 0); // Start at 8 AM

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    
    const { error: stopError } = await supabase
      .from('fuel_delivery_route_stops')
      .insert({
        route_id: route.id,
        customer_id: stop.customerId,
        stop_sequence: i + 1,
        status: 'pending',
        estimated_arrival: estimatedTime.toISOString(),
        preferred_time_window: stop.preferredTimeWindow,
        estimated_duration_minutes: stop.estimatedServiceMinutes,
      });

    if (stopError) {
      result.errors.push(`Failed to create stop for ${stop.customerName}: ${stopError.message}`);
    } else {
      result.stopsCreated++;
    }

    // Add estimated service time + 15 min travel for next stop
    estimatedTime = addDays(estimatedTime, 0);
    estimatedTime.setMinutes(estimatedTime.getMinutes() + (stop.estimatedServiceMinutes || 15) + 15);
  }

  return result;
}

/**
 * Generate routes for a date range
 */
export async function generateRoutesForDateRange(
  shopId: string,
  startDate: Date,
  endDate: Date,
  driverId?: string,
  truckId?: string
): Promise<GenerationResult> {
  const totalResult: GenerationResult = {
    routesCreated: 0,
    stopsCreated: 0,
    errors: [],
  };

  let currentDate = startOfDay(startDate);
  const end = endOfDay(endDate);

  while (currentDate <= end) {
    const result = await generateRoutesForDate(shopId, currentDate, driverId, truckId);
    totalResult.routesCreated += result.routesCreated;
    totalResult.stopsCreated += result.stopsCreated;
    totalResult.errors.push(...result.errors);
    
    currentDate = addDays(currentDate, 1);
  }

  return totalResult;
}

/**
 * Preview what routes would be generated for a date (without creating them)
 */
export async function previewRoutesForDate(
  shopId: string,
  date: Date
): Promise<GeneratedRoute | null> {
  const dayOfWeek = getDay(date);
  const stops = await getScheduledDeliveriesForDay(shopId, dayOfWeek);

  if (stops.length === 0) {
    return null;
  }

  return {
    routeName: `${format(date, 'EEEE')} Deliveries - ${format(date, 'MMM d')}`,
    routeDate: format(date, 'yyyy-MM-dd'),
    stops,
  };
}

/**
 * Get the next N days that have scheduled deliveries
 */
export async function getUpcomingDeliveryDays(
  shopId: string,
  daysToCheck: number = 7
): Promise<Array<{ date: Date; dayOfWeek: number; stopCount: number }>> {
  const result: Array<{ date: Date; dayOfWeek: number; stopCount: number }> = [];
  
  let currentDate = startOfDay(new Date());
  
  for (let i = 0; i < daysToCheck; i++) {
    const dayOfWeek = getDay(currentDate);
    const stops = await getScheduledDeliveriesForDay(shopId, dayOfWeek);
    
    if (stops.length > 0) {
      result.push({
        date: new Date(currentDate),
        dayOfWeek,
        stopCount: stops.length,
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return result;
}
