import { supabase } from "@/lib/supabase";
import { CalendarEvent, CreateCalendarEventDto } from "@/types/calendar/events";
import { handleApiError } from "@/utils/errorHandling";

/**
 * Fetch calendar events for a specified date range
 */
export async function getCalendarEvents(
  startDate: string, 
  endDate: string
): Promise<CalendarEvent[]> {
  try {
    // Build full day time bounds to correctly include overlapping events
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59.999`;

    // Fetch events that overlap the range [startDate, endDate]
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        all_day,
        location,
        customer_id,
        work_order_id,
        technician_id,
        event_type,
        status,
        priority,
        created_by,
        created_at,
        updated_at
      `)
      .lte('start_time', endDateTime)
      .gte('end_time', startDateTime)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Format the events for the UI
    const formattedEvents = await Promise.all(
      data.map(async (event) => {
        // Get customer name if customer_id exists
        let customer = undefined;
        if (event.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', event.customer_id)
            .single();
          
          if (customerData) {
            customer = `${customerData.first_name} ${customerData.last_name}`;
          }
        }
        
        // Get technician name if technician_id exists
        let technician = undefined;
        if (event.technician_id) {
          const { data: technicianData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', event.technician_id)
            .single();
          
          if (technicianData) {
            technician = `${technicianData.first_name} ${technicianData.last_name}`;
          }
        }
        
        return {
          ...event,
          customer,
          technician,
          // Convert to expected format
          start: event.start_time,
          end: event.end_time,
          allDay: event.all_day,
          workOrderId: event.work_order_id,
          type: event.event_type
        } as CalendarEvent;
      })
    );

    return formattedEvents;
  } catch (error) {
    handleApiError(error, "Failed to fetch calendar events");
    return [];
  }
}

/**
 * Fetch work order events for the calendar
 */
export async function getWorkOrderEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  try {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59.999`;

    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        description,
        status,
        start_time,
        end_time,
        customer_id,
        technician_id,
        vehicle_id
      `)
      .not('start_time', 'is', null)
      .lte('start_time', endDateTime)
      .gte('start_time', startDateTime)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Format the work orders as calendar events
    const workOrderEvents = await Promise.all(
      data.map(async (wo) => {
        // Get customer name
        let customer = "Unknown Customer";
        if (wo.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', wo.customer_id)
            .single();
          
          if (customerData) {
            customer = `${customerData.first_name} ${customerData.last_name}`;
          }
        }
        
        // Get technician name
        let technician = "Unassigned";
        if (wo.technician_id) {
          const { data: technicianData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', wo.technician_id)
            .single();
          
          if (technicianData) {
            technician = `${technicianData.first_name} ${technicianData.last_name}`;
          }
        }

        // Get location
        let location = "";
        if (wo.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('make, model')
            .eq('id', wo.vehicle_id)
            .single();
          
          if (vehicleData) {
            location = `${vehicleData.make} ${vehicleData.model}`;
          }
        }

        return {
          id: wo.id,
          title: wo.description || 'Work Order',
          description: wo.description,
          start: wo.start_time,
          end: wo.end_time || wo.start_time, // Use start_time as fallback
          allDay: false,
          location,
          workOrderId: wo.id,
          type: 'work-order',
          status: wo.status,
          priority: 'medium', // Default priority
          customer,
          technician,
          assignedTo: technician,
          start_time: wo.start_time,
          end_time: wo.end_time || wo.start_time
        };
      })
    );

    return workOrderEvents;
  } catch (error) {
    handleApiError(error, "Failed to fetch work order events");
    return [];
  }
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
  eventData: CreateCalendarEventDto
): Promise<CalendarEvent | null> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;
    
    // Format response to match CalendarEvent type
    return {
      ...data,
      start: data.start_time,
      end: data.end_time,
      allDay: data.all_day,
      workOrderId: data.work_order_id,
      type: data.event_type
    };
  } catch (error) {
    handleApiError(error, "Failed to create calendar event");
    return null;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  id: string,
  eventData: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  try {
    // Convert to database field names
    const dbEventData = {
      ...eventData,
      start_time: eventData.start,
      end_time: eventData.end,
      all_day: eventData.allDay,
      work_order_id: eventData.workOrderId,
      event_type: eventData.type
    };

    const { data, error } = await supabase
      .from('calendar_events')
      .update(dbEventData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Format response to match CalendarEvent type
    return {
      ...data,
      start: data.start_time,
      end: data.end_time,
      allDay: data.all_day,
      workOrderId: data.work_order_id,
      type: data.event_type
    };
  } catch (error) {
    handleApiError(error, "Failed to update calendar event");
    return null;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, "Failed to delete calendar event");
    return false;
  }
}

/**
 * Fetch ALL overdue work orders (past due, not completed/cancelled/invoiced)
 * This fetches regardless of date range to ensure overdue items always show
 */
export async function getOverdueWorkOrders(): Promise<CalendarEvent[]> {
  try {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        description,
        status,
        start_time,
        end_time,
        customer_id,
        technician_id,
        vehicle_id
      `)
      .not('start_time', 'is', null)
      .lt('start_time', today)
      .not('status', 'in', '("completed","cancelled","invoiced")')
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Format the work orders as calendar events
    const overdueEvents = await Promise.all(
      data.map(async (wo) => {
        // Get customer name
        let customer = "Unknown Customer";
        if (wo.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', wo.customer_id)
            .single();
          
          if (customerData) {
            customer = `${customerData.first_name} ${customerData.last_name}`;
          }
        }
        
        // Get technician name
        let technician = "Unassigned";
        if (wo.technician_id) {
          const { data: technicianData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', wo.technician_id)
            .single();
          
          if (technicianData) {
            technician = `${technicianData.first_name} ${technicianData.last_name}`;
          }
        }

        // Get location
        let location = "";
        if (wo.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('make, model')
            .eq('id', wo.vehicle_id)
            .single();
          
          if (vehicleData) {
            location = `${vehicleData.make} ${vehicleData.model}`;
          }
        }

        return {
          id: wo.id,
          title: wo.description || 'Work Order',
          description: wo.description,
          start: wo.start_time,
          end: wo.end_time || wo.start_time,
          allDay: false,
          location,
          workOrderId: wo.id,
          type: 'work-order',
          status: wo.status,
          priority: 'medium',
          customer,
          technician,
          assignedTo: technician,
          start_time: wo.start_time,
          end_time: wo.end_time || wo.start_time
        };
      })
    );

    return overdueEvents;
  } catch (error) {
    handleApiError(error, "Failed to fetch overdue work orders");
    return [];
  }
}
