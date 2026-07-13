import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';

export interface RouteUpdateSummary {
  routesToAddTo: Array<{ id: string; route_name: string; route_date: string }>;
  routesToRemoveFrom: Array<{ id: string; route_name: string; route_date: string }>;
  stopsToCreate: number;
  stopsToRemove: number;
}

export interface RouteStop {
  id: string;
  route_id: string;
  customer_id?: string;
  location_id?: string;
  stop_order: number;
}

/**
 * Analyzes how future routes will be affected by a delivery_days change
 */
export async function analyzeRouteChanges(
  customerId: string,
  locationId: string | null,
  newDeliveryDays: number[],
  shopId: string
): Promise<RouteUpdateSummary> {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // Get future planned routes
  const { data: futureRoutes, error: routesError } = await (supabase as any)
    .from('fuel_delivery_routes')
    .select('id, route_name, route_date')
    .eq('shop_id', shopId)
    .eq('status', 'planned')
    .gte('route_date', todayStr)
    .order('route_date');

  if (routesError) throw routesError;

  // Get existing stops for this customer/location
  let stopsQuery = (supabase as any)
    .from('fuel_delivery_route_stops')
    .select('id, route_id, customer_id, location_id');

  if (locationId) {
    stopsQuery = stopsQuery.eq('location_id', locationId);
  } else {
    stopsQuery = stopsQuery.eq('customer_id', customerId);
  }

  const { data: existingStops, error: stopsError } = await stopsQuery;
  if (stopsError) throw stopsError;

  const existingStopRouteIds = new Set((existingStops || []).map((s: RouteStop) => s.route_id));

  const routesToAddTo: RouteUpdateSummary['routesToAddTo'] = [];
  const routesToRemoveFrom: RouteUpdateSummary['routesToRemoveFrom'] = [];

  for (const route of futureRoutes || []) {
    const routeDate = new Date(route.route_date);
    const dayOfWeek = routeDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const shouldBeOnRoute = newDeliveryDays.includes(dayOfWeek);
    const isOnRoute = existingStopRouteIds.has(route.id);

    if (shouldBeOnRoute && !isOnRoute) {
      routesToAddTo.push(route);
    } else if (!shouldBeOnRoute && isOnRoute) {
      routesToRemoveFrom.push(route);
    }
  }

  return {
    routesToAddTo,
    routesToRemoveFrom,
    stopsToCreate: routesToAddTo.length,
    stopsToRemove: routesToRemoveFrom.length
  };
}

/**
 * Regenerates routes for a customer when their delivery_days change
 */
export async function regenerateRoutesForCustomer(
  customerId: string,
  newDeliveryDays: number[],
  shopId: string
): Promise<{ added: number; removed: number }> {
  const summary = await analyzeRouteChanges(customerId, null, newDeliveryDays, shopId);
  
  let added = 0;
  let removed = 0;

  // Remove stops from routes that no longer match
  if (summary.routesToRemoveFrom.length > 0) {
    const routeIds = summary.routesToRemoveFrom.map(r => r.id);
    const { error } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .delete()
      .eq('customer_id', customerId)
      .in('route_id', routeIds);
    
    if (!error) {
      removed = summary.routesToRemoveFrom.length;
    }
  }

  // Add stops to routes that now match
  for (const route of summary.routesToAddTo) {
    // Get the max stop_order for this route
    const { data: maxOrderData } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .select('stop_order')
      .eq('route_id', route.id)
      .order('stop_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.stop_order || 0) + 1;

    // Get customer info for the stop
    const { data: customer } = await (supabase as any)
      .from('fuel_delivery_customers')
      .select('billing_address, billing_latitude, billing_longitude')
      .eq('id', customerId)
      .single();

    const { error } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .insert({
        route_id: route.id,
        customer_id: customerId,
        stop_order: nextOrder,
        status: 'pending',
        address: customer?.billing_address,
        latitude: customer?.billing_latitude,
        longitude: customer?.billing_longitude
      });

    if (!error) {
      added++;
    }
  }

  // Update total_stops count on affected routes
  const allAffectedRouteIds = [
    ...summary.routesToAddTo.map(r => r.id),
    ...summary.routesToRemoveFrom.map(r => r.id)
  ];

  for (const routeId of allAffectedRouteIds) {
    const { count } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeId);

    await (supabase as any)
      .from('fuel_delivery_routes')
      .update({ total_stops: count || 0 })
      .eq('id', routeId);
  }

  return { added, removed };
}

/**
 * Regenerates routes for a specific location when its delivery_days change
 */
export async function regenerateRoutesForLocation(
  locationId: string,
  customerId: string,
  newDeliveryDays: number[],
  shopId: string
): Promise<{ added: number; removed: number }> {
  const summary = await analyzeRouteChanges(customerId, locationId, newDeliveryDays, shopId);
  
  let added = 0;
  let removed = 0;

  // Remove stops from routes that no longer match
  if (summary.routesToRemoveFrom.length > 0) {
    const routeIds = summary.routesToRemoveFrom.map(r => r.id);
    const { error } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .delete()
      .eq('location_id', locationId)
      .in('route_id', routeIds);
    
    if (!error) {
      removed = summary.routesToRemoveFrom.length;
    }
  }

  // Add stops to routes that now match
  for (const route of summary.routesToAddTo) {
    // Get the max stop_order for this route
    const { data: maxOrderData } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .select('stop_order')
      .eq('route_id', route.id)
      .order('stop_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.stop_order || 0) + 1;

    // Get location info for the stop
    const { data: location } = await (supabase as any)
      .from('fuel_delivery_locations')
      .select('address, latitude, longitude')
      .eq('id', locationId)
      .single();

    const { error } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .insert({
        route_id: route.id,
        customer_id: customerId,
        location_id: locationId,
        stop_order: nextOrder,
        status: 'pending',
        address: location?.address,
        latitude: location?.latitude,
        longitude: location?.longitude
      });

    if (!error) {
      added++;
    }
  }

  // Update total_stops count on affected routes
  const allAffectedRouteIds = [
    ...summary.routesToAddTo.map(r => r.id),
    ...summary.routesToRemoveFrom.map(r => r.id)
  ];

  for (const routeId of allAffectedRouteIds) {
    const { count } = await (supabase as any)
      .from('fuel_delivery_route_stops')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeId);

    await (supabase as any)
      .from('fuel_delivery_routes')
      .update({ total_stops: count || 0 })
      .eq('id', routeId);
  }

  return { added, removed };
}

/**
 * Syncs location delivery_days with customer's schedule when location has no custom schedule
 */
export async function syncLocationSchedulesWithCustomer(
  customerId: string,
  newDeliveryDays: number[],
  shopId: string
): Promise<number> {
  // Find locations that have empty delivery_days (they inherit from customer)
  const { data: locations, error } = await (supabase as any)
    .from('fuel_delivery_locations')
    .select('id, delivery_days')
    .eq('customer_id', customerId);

  if (error) throw error;

  let updated = 0;

  for (const location of locations || []) {
    // Only update locations that have no custom schedule (empty or null delivery_days)
    const hasCustomSchedule = location.delivery_days && location.delivery_days.length > 0;
    
    if (!hasCustomSchedule) {
      // These locations inherit customer's schedule, so regenerate their routes
      await regenerateRoutesForLocation(location.id, customerId, newDeliveryDays, shopId);
      updated++;
    }
  }

  return updated;
}

/**
 * Get formatted day names for display
 */
export function formatDeliveryDays(days: number[]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.sort((a, b) => a - b).map(d => dayNames[d]).join(', ');
}

/**
 * Check if delivery_days arrays are different
 */
export function deliveryDaysChanged(oldDays: number[] | null | undefined, newDays: number[]): boolean {
  const old = Array.isArray(oldDays) ? oldDays.sort((a, b) => a - b) : [];
  const updated = newDays.sort((a, b) => a - b);
  
  if (old.length !== updated.length) return true;
  return !old.every((day, index) => day === updated[index]);
}
