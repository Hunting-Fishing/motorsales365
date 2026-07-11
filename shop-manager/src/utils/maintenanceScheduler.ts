
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, addDays, addYears, parseISO, format } from 'date-fns';

// Get upcoming maintenance schedules from equipment list
export const getUpcomingMaintenanceSchedules = (
  equipmentList: EquipmentWithMaintenance[],
  days: number = 30
): Array<{ equipment: EquipmentWithMaintenance; dueDate: string }> => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  const upcomingMaintenance: Array<{ equipment: EquipmentWithMaintenance; dueDate: string }> = [];
  
  // Add based on nextMaintenanceDate field
  equipmentList.forEach(equipment => {
    if (equipment.next_maintenance_date) {
      const nextDate = new Date(equipment.next_maintenance_date);
      
      if (nextDate >= today && nextDate <= futureDate) {
        upcomingMaintenance.push({
          equipment,
          dueDate: equipment.next_maintenance_date
        });
      }
    }
  });
  
  // Sort by date (closest first)
  return upcomingMaintenance.sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
};

// Schedule maintenance work order
export const scheduleMaintenanceWorkOrder = async (
  equipment: EquipmentWithMaintenance,
  description: string
): Promise<string> => {
  try {
    // Get current user's shop_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();
    
    if (!profile?.shop_id) throw new Error('User shop not found');
    
    // Create a real work order in the database
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        description: `Scheduled maintenance: ${description}`,
        status: 'pending',
        shop_id: profile.shop_id,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating work order:", error);
      throw error;
    }
    
    // Return the actual ID
    return data.id;
  } catch (error) {
    console.error("Error scheduling maintenance work order:", error);
    throw error;
  }
};

// Calculate the next maintenance date based on frequency
export const calculateNextMaintenanceDate = (
  currentDate: string, 
  frequencyType: string
): string => {
  const dateObj = parseISO(currentDate);
  let nextDate: Date;
  
  switch (frequencyType) {
    case 'monthly':
      nextDate = addMonths(dateObj, 1);
      break;
    case 'quarterly':
      nextDate = addMonths(dateObj, 3);
      break;
    case 'bi-annually':
      nextDate = addMonths(dateObj, 6);
      break;
    case 'annually':
      nextDate = addYears(dateObj, 1);
      break;
    case 'as-needed':
    default:
      // For 'as-needed', we'll default to 3 months
      nextDate = addMonths(dateObj, 3);
      break;
  }
  
  return format(nextDate, 'yyyy-MM-dd');
};
