import { supabase } from "@/lib/supabase";
import { CalendarEvent } from "@/types/calendar/events";
import { handleApiError } from "@/utils/errorHandling";

/**
 * Fetch maintenance requests and convert them to calendar events
 */
export async function getMaintenanceRequestEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  try {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59.999`;

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        id,
        request_number,
        title,
        description,
        status,
        priority,
        requested_at,
        assigned_to,
        assigned_to_name,
        requested_by_name,
        equipment_id
      `)
      .not('requested_at', 'is', null)
      .gte('requested_at', startDateTime)
      .lte('requested_at', endDateTime)
      .order('requested_at', { ascending: true });

    if (error) throw error;

    // Get equipment names for each request
    const maintenanceEvents = await Promise.all(
      data.map(async (request) => {
        // Get equipment name
        let equipmentName = "Unknown Equipment";
        if (request.equipment_id) {
          const { data: equipmentData } = await supabase
            .from('equipment_assets')
            .select('name')
            .eq('id', request.equipment_id)
            .single();
          
          if (equipmentData) {
            equipmentName = equipmentData.name;
          }
        }

        // Calculate end time (1 hour after requested_at for calendar display)
        const requestedAt = new Date(request.requested_at!);
        const endTime = new Date(requestedAt.getTime() + 60 * 60 * 1000); // +1 hour

        return {
          id: `maintenance-${request.id}`,
          title: `${request.request_number}: ${equipmentName} - ${request.title}`,
          description: request.description,
          start: request.requested_at!,
          end: endTime.toISOString(),
          allDay: false,
          location: equipmentName,
          type: 'maintenance-request',
          status: request.status || 'pending',
          priority: request.priority,
          technician: request.assigned_to_name || 'Unassigned',
          customer: request.requested_by_name,
          color: getPriorityColor(request.priority),
          // Store original IDs for reference
          work_order_id: request.id,
          technician_id: request.assigned_to,
          start_time: request.requested_at!,
          end_time: endTime.toISOString()
        } as CalendarEvent;
      })
    );

    return maintenanceEvents;
  } catch (error) {
    handleApiError(error, "Failed to fetch maintenance request events");
    return [];
  }
}

/**
 * Fetch a single maintenance request by ID
 */
export async function getMaintenanceRequestById(id: string) {
  try {
    // Strip "maintenance-" prefix if present
    const cleanId = id.replace(/^maintenance-/, '');
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        id,
        request_number,
        title,
        description,
        status,
        priority,
        requested_at,
        assigned_to,
        assigned_to_name,
        requested_by_name,
        equipment_id
      `)
      .eq('id', cleanId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('Maintenance request not found');
    }

    // Get equipment name
    let equipmentName = "Unknown Equipment";
    if (data.equipment_id) {
      const { data: equipmentData } = await supabase
        .from('equipment_assets')
        .select('name')
        .eq('id', data.equipment_id)
        .single();
      
      if (equipmentData) {
        equipmentName = equipmentData.name;
      }
    }

    return {
      ...data,
      equipment_name: equipmentName
    };
  } catch (error) {
    handleApiError(error, "Failed to fetch maintenance request");
    throw error;
  }
}

/**
 * Get color based on priority
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: '#ef4444',    // red
    high: '#f97316',      // orange
    medium: '#eab308',    // yellow
    low: '#6b7280'        // gray
  };
  
  return colors[priority.toLowerCase()] || colors.medium;
}
