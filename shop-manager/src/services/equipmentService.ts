
import { supabase } from "@/integrations/supabase/client";
import type { Equipment, EquipmentStatus, MaintenanceRecord, MaintenanceSchedule } from "@/types/equipment";
import { transformEquipmentData, prepareEquipmentForInsert } from "@/utils/equipment/typeUtils";

// Define the interface that matches the actual database structure
export interface EquipmentWithMaintenance extends Equipment {
  shop_id?: string | null;
}

export const fetchEquipment = async (): Promise<EquipmentWithMaintenance[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .order('name');

    if (error) {
      console.error("Error fetching equipment:", error);
      throw error;
    }

    return (data || []).map(transformEquipmentData);
  } catch (error) {
    console.error("Error in fetchEquipment:", error);
    return [];
  }
};

export const getOverdueMaintenanceEquipment = async (): Promise<EquipmentWithMaintenance[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .lt('next_service_date', today)
      .not('next_service_date', 'is', null);

    if (error) {
      console.error("Error fetching overdue equipment:", error);
      throw error;
    }

    return (data || []).map(transformEquipmentData);
  } catch (error) {
    console.error("Error in getOverdueMaintenanceEquipment:", error);
    return [];
  }
};

export interface CreateEquipmentData {
  name: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  category: string;
  purchase_date?: string;
  install_date?: string;
  customer: string;
  location?: string;
  status?: EquipmentStatus;
  next_maintenance_date?: string;
  maintenance_frequency?: string;
  last_maintenance_date?: string;
  warranty_expiry_date?: string;
  warranty_status?: string;
  notes?: string;
}

export const createEquipment = async (equipmentData: CreateEquipmentData): Promise<EquipmentWithMaintenance | null> => {
  try {
    // Get current user's shop_id from profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) throw new Error('No shop associated with user');

    // Generate asset number
    const assetNumber = `AST-${Date.now()}`;
    
    // Map old schema to new schema
    const insertData = {
      shop_id: profile.shop_id,
      equipment_type: equipmentData.category as any,
      asset_number: assetNumber,
      name: equipmentData.name,
      manufacturer: equipmentData.manufacturer || null,
      model: equipmentData.model || null,
      serial_number: equipmentData.serial_number || null,
      location: equipmentData.location || null,
      purchase_date: equipmentData.purchase_date || null,
      status: (equipmentData.status === 'out_of_service' ? 'down' : equipmentData.status) as any,
      next_service_date: equipmentData.next_maintenance_date || null,
      last_service_date: equipmentData.last_maintenance_date || null,
      current_hours: 0,
      current_mileage: 0,
      maintenance_intervals: [],
      notes: equipmentData.notes || null,
      created_by: user.id
    };
    
    console.log('Inserting equipment data:', insertData);

    const { data, error } = await supabase
      .from('equipment_assets')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating equipment:", error);
      throw error;
    }

    return transformEquipmentData(data);
  } catch (error) {
    console.error("Error in createEquipment:", error);
    return null;
  }
};

export const updateEquipment = async (id: string, updates: Partial<CreateEquipmentData>): Promise<EquipmentWithMaintenance | null> => {
  try {
    // Map old schema fields to new schema
    const mappedUpdates: any = {};
    
    if (updates.name) mappedUpdates.name = updates.name;
    if (updates.manufacturer) mappedUpdates.manufacturer = updates.manufacturer;
    if (updates.model) mappedUpdates.model = updates.model;
    if (updates.serial_number) mappedUpdates.serial_number = updates.serial_number;
    if (updates.location) mappedUpdates.location = updates.location;
    if (updates.purchase_date) mappedUpdates.purchase_date = updates.purchase_date;
    if (updates.notes) mappedUpdates.notes = updates.notes;
    if (updates.category) mappedUpdates.equipment_type = updates.category;
    if (updates.next_maintenance_date) mappedUpdates.next_service_date = updates.next_maintenance_date;
    if (updates.last_maintenance_date) mappedUpdates.last_service_date = updates.last_maintenance_date;
    
    // Map status if provided
    if (updates.status) {
      mappedUpdates.status = updates.status === 'out_of_service' ? 'down' : updates.status;
    }

    const { data, error } = await supabase
      .from('equipment_assets')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating equipment:", error);
      throw error;
    }

    return transformEquipmentData(data);
  } catch (error) {
    console.error("Error in updateEquipment:", error);
    return null;
  }
};
