
import { supabase } from "@/lib/supabase";
import { EquipmentRecommendation } from "@/types/dashboard";
import { Equipment } from "@/types/equipment";
import { addDays, differenceInDays, parseISO, isAfter } from "date-fns";

// Get equipment recommendations for dashboard
export const getEquipmentRecommendations = async (): Promise<EquipmentRecommendation[]> => {
  try {
    // Fetch equipment that needs maintenance or has issues
    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .or('status.eq.maintenance,status.eq.down')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    // Convert to equipment recommendations format
    return data.map(item => {
      // Determine priority based on equipment status
      let priority: "High" | "Medium" | "Low" = "Medium";
      
      if (item.status === "down") {
        priority = "High";
      } else if (item.status === "maintenance") {
        priority = "Medium";
      }
      
      // Format maintenance date for display
      const maintenanceDate = 'Not scheduled';
      
      // Determine maintenance type
      const maintenanceType = 'General Maintenance';
      
      return {
        id: item.id,
        name: item.name,
        model: item.model || 'Unknown model',
        manufacturer: item.manufacturer || 'Unknown manufacturer',
        status: item.status || 'operational',
        maintenanceType: maintenanceType,
        maintenanceDate: maintenanceDate,
        priority: priority
      };
    });
  } catch (error) {
    console.error("Error fetching equipment recommendations:", error);
    return [];
  }
};
