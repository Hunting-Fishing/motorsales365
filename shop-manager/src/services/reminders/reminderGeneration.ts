
import { supabase } from '@/integrations/supabase/client';

interface ServiceInterval {
  type: string;
  intervalMonths?: number;
}

// Default service intervals (in months)
const DEFAULT_SERVICE_INTERVALS: ServiceInterval[] = [
  { type: 'oil_change', intervalMonths: 3 },
  { type: 'tire_rotation', intervalMonths: 6 },
  { type: 'brake_inspection', intervalMonths: 12 },
  { type: 'annual_inspection', intervalMonths: 12 },
  { type: 'transmission_service', intervalMonths: 24 },
  { type: 'coolant_flush', intervalMonths: 24 },
];

/**
 * Generate service reminders based on vehicle data and last service dates
 * Creates reminders for upcoming maintenance based on time intervals
 */
export const generateServiceReminders = async (): Promise<number> => {
  try {
    // Get current user for context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user for reminder generation');
      return 0;
    }

    // Get all vehicles with their last service dates
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        customer_id,
        make,
        model,
        year,
        last_service_date
      `);

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return 0;
    }

    if (!vehicles || vehicles.length === 0) {
      return 0;
    }

    let remindersCreated = 0;
    const today = new Date();

    for (const vehicle of vehicles) {
      if (!vehicle.customer_id) continue;

      // For each service type, check if a reminder is needed
      for (const interval of DEFAULT_SERVICE_INTERVALS) {
        let needsReminder = false;
        let dueDate = new Date();

        // Check if vehicle has a last service date
        if (vehicle.last_service_date) {
          const lastServiceDate = new Date(vehicle.last_service_date);
          
          // Check time-based interval
          if (interval.intervalMonths) {
            const nextDue = new Date(lastServiceDate);
            nextDue.setMonth(nextDue.getMonth() + interval.intervalMonths);
            
            // Create reminder if due within 30 days
            if (nextDue <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
              needsReminder = true;
              dueDate = nextDue;
            }
          }
        }

        if (needsReminder) {
          // Check if reminder already exists
          const { data: existingReminder } = await supabase
            .from('service_reminders')
            .select('id')
            .eq('vehicle_id', vehicle.id)
            .eq('type', interval.type)
            .eq('status', 'pending')
            .maybeSingle();

          if (!existingReminder) {
            // Create new reminder
            const { error: insertError } = await supabase
              .from('service_reminders')
              .insert({
                customer_id: vehicle.customer_id,
                vehicle_id: vehicle.id,
                type: interval.type,
                title: `${interval.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Due`,
                description: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''} is due for ${interval.type.replace(/_/g, ' ')}`.trim(),
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
                priority: dueDate < today ? 'high' : 'medium',
                created_by: user.id
              });

            if (!insertError) {
              remindersCreated++;
            } else {
              console.error('Error creating reminder:', insertError);
            }
          }
        }
      }
    }

    console.log(`Generated ${remindersCreated} service reminders`);
    return remindersCreated;
  } catch (error) {
    console.error('Error generating service reminders:', error);
    return 0;
  }
};
