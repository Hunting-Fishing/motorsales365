
import { supabase } from "@/lib/supabase";
import { addDays, format } from "date-fns";

export interface TimeSlot {
  id: string;
  time: string;
  technician?: string;
  technician_id?: string;
  available: boolean;
}

export interface BookingRequestDto {
  customer_id: string;
  technician_id: string;
  date: string;
  time_slot: string;
  service_type: string;
  notes: string;
}

/**
 * Check if the customer has booking permissions
 */
export async function checkBookingPermissions(customerId: string): Promise<boolean> {
  try {
    // First check global shop setting
    const { data: shopSettings, error: shopError } = await supabase
      .from('shop_settings')
      .select('booking_enabled')
      .limit(1)
      .single();
    
    if (shopError || !shopSettings?.booking_enabled) {
      return false;
    }
    
    // Check individual customer permission
    const { data: relationshipData, error: relationshipError } = await supabase
      .from('customer_shop_relationships')
      .select('booking_enabled')
      .eq('customer_id', customerId)
      .limit(1)
      .single();
    
    if (relationshipError) {
      console.error('Error fetching customer booking permissions:', relationshipError);
      // Default to true if relationship not found (legacy behavior)
      return true;
    }
    
    return relationshipData.booking_enabled;
  } catch (error) {
    console.error("Error checking booking permissions:", error);
    // Default to false on error for security
    return false;
  }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableTimeSlots(date: string): Promise<TimeSlot[]> {
  try {
    // Get business hours for the shop
    const { data: businessHours } = await supabase
      .from('shop_hours')
      .select('*')
      .eq('day_of_week', new Date(date).getDay())
      .limit(1);
    
    // Get technician schedules for that day
    const { data: techSchedules } = await supabase
      .from('technician_schedules')
      .select(`
        id,
        technician_id,
        start_time,
        end_time,
        profiles:technician_id (
          first_name,
          last_name
        )
      `)
      .eq('day_of_week', new Date(date).getDay())
      .eq('is_recurring', true);

    // Get specific date schedules (overrides)
    const { data: specificSchedules } = await supabase
      .from('technician_schedules')
      .select(`
        id,
        technician_id,
        start_time,
        end_time,
        profiles:technician_id (
          first_name,
          last_name
        )
      `)
      .eq('specific_date', date)
      .eq('is_recurring', false);

    // Get existing appointments for that day
    const { data: existingAppointments } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`);

    // Default business hours if not found
    const openHour = businessHours?.[0]?.open_time || '09:00:00';
    const closeHour = businessHours?.[0]?.close_time || '17:00:00';
    const isClosed = businessHours?.[0]?.is_closed || false;

    // If shop is closed, return empty array
    if (isClosed) {
      return [];
    }

    // Generate time slots (hourly from open to close)
    const startHour = parseInt(openHour.split(':')[0]);
    const endHour = parseInt(closeHour.split(':')[0]);
    
    // Combine all schedules (regular + specific date overrides)
    const allSchedules = [...(techSchedules || []), ...(specificSchedules || [])];
    
    // Generate all possible time slots
    const timeSlots: TimeSlot[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      
      // Check each technician's availability for this time slot
      for (const tech of allSchedules) {
        const techStartHour = parseInt(tech.start_time.split(':')[0]);
        const techEndHour = parseInt(tech.end_time.split(':')[0]);
        
        // Check if technician is available at this hour
        if (hour >= techStartHour && hour < techEndHour) {
          // Check if technician has appointments at this time
          const hasConflict = existingAppointments?.some(appt => {
            const apptStart = new Date(appt.start_time);
            const apptHour = apptStart.getHours();
            return appt.technician_id === tech.technician_id && apptHour === hour;
          });
          
          if (!hasConflict) {
            // Properly handle the profiles object with type assertion
            const profiles = tech.profiles as { first_name?: string; last_name?: string } | null;
            const technicianName = profiles 
              ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() 
              : 'Unknown';
            
            timeSlots.push({
              id: `${tech.technician_id}-${hour}`,
              time: timeString,
              technician: technicianName,
              technician_id: tech.technician_id,
              available: true
            });
          }
        }
      }
    }
    
    return timeSlots;
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return [];
  }
}

/**
 * Create a new booking request
 */
export async function createBookingRequest(booking: BookingRequestDto): Promise<boolean> {
  try {
    // First check if the customer has booking permissions
    const hasPermission = await checkBookingPermissions(booking.customer_id);
    if (!hasPermission) {
      console.error("Customer does not have booking permission:", booking.customer_id);
      return false;
    }
    
    // Create calendar event for the booking
    const { error } = await supabase
      .from('calendar_events')
      .insert([
        {
          title: 'Appointment Request',
          description: booking.notes,
          start_time: `${booking.date}T${booking.time_slot}:00`,
          end_time: `${booking.date}T${Number(booking.time_slot.split(':')[0]) + 1}:00:00`,
          customer_id: booking.customer_id,
          technician_id: booking.technician_id,
          event_type: 'appointment',
          status: 'pending',
          priority: 'medium'
        }
      ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating booking request:", error);
    return false;
  }
}

/**
 * Get a list of dates that have available technician slots
 * Useful for highlighting available days in the calendar
 */
export async function getAvailableDates(startDate: Date, endDate: Date): Promise<string[]> {
  try {
    // This is a simplified version - in a real implementation, 
    // you would check business hours and technician availability for each day
    const result: string[] = [];
    let currentDate = startDate;
    
    while (currentDate <= endDate) {
      // Skip weekends in this example
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        result.push(format(currentDate, 'yyyy-MM-dd'));
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching available dates:", error);
    return [];
  }
}
