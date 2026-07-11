import { supabase } from '@/lib/supabase';
import { Equipment } from '@/types/equipment';

export interface EquipmentDetails extends Equipment {
  maintenanceRecords: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    technician: string;
    cost: number;
    nextMaintenanceDate?: string;
  }>;
  currentStatus: 'operational' | 'maintenance' | 'down' | 'repair';
  specifications: Record<string, string>;
  assignedTo?: string;
  type?: string;
  description?: string;
  current_value?: number;
  // All equipment_assets fields
  equipment_type?: string;
  unit_number?: string;
  asset_number?: string;
  year?: number;
  vin_number?: string;
  engine_id?: string;
  plate_number?: string;
  registration_state?: string;
  registration_expiry?: string;
  title_number?: string;
  title_status?: string;
  current_hours?: number;
  current_mileage?: number;
  profile_image_url?: string | null;
  purchase_cost?: number;
  department?: string;
  last_service_date?: string;
  next_service_date?: string;
  shop_id?: string;
  inspection_template_id?: string | null;
}

export async function getEquipmentById(id: string): Promise<EquipmentDetails | null> {
  try {
    const { data: equipment, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!equipment) return null;

    // Get maintenance records
    const { data: maintenance } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false });

    return {
      // Core identification
      id: equipment.id,
      name: equipment.name,
      
      // Equipment info
      equipment_type: equipment.equipment_type,
      unit_number: equipment.unit_number || undefined,
      asset_number: equipment.asset_number,
      manufacturer: equipment.manufacturer || '',
      model: equipment.model || '',
      year: equipment.year || undefined,
      serial_number: equipment.serial_number || '',
      
      // Vehicle-specific fields
      vin_number: equipment.vin_number || undefined,
      engine_id: equipment.engine_id || undefined,
      plate_number: equipment.plate_number || undefined,
      registration_state: equipment.registration_state || undefined,
      registration_expiry: equipment.registration_expiry || undefined,
      title_number: equipment.title_number || undefined,
      title_status: equipment.title_status || undefined,
      
      // Usage & Location
      location: equipment.location || 'Unknown',
      department: equipment.department || undefined,
      current_hours: equipment.current_hours || undefined,
      current_mileage: equipment.current_mileage || undefined,
      status: equipment.status || 'operational',
      currentStatus: (equipment.status === 'retired' ? 'down' : equipment.status || 'operational') as any,
      assignedTo: equipment.assigned_to || undefined,
      
      // Purchase & Value
      purchase_date: equipment.purchase_date || '',
      purchase_cost: equipment.purchase_cost || undefined,
      
      // Service dates
      last_service_date: equipment.last_service_date || undefined,
      next_service_date: equipment.next_service_date || undefined,
      
      // Media & Notes
      profile_image_url: equipment.profile_image_url,
      notes: equipment.notes || undefined,
      
      // Technical specifications
      specifications: (typeof equipment.specifications === 'object' && equipment.specifications !== null) 
        ? equipment.specifications as Record<string, string>
        : {},
      
      // Maintenance records
      maintenanceRecords: maintenance?.map(m => ({
        id: m.id,
        date: m.created_at,
        type: m.maintenance_type || 'General',
        description: m.description || '',
        technician: m.assigned_technician_id || 'Unassigned',
        cost: m.estimated_cost || 0,
        nextMaintenanceDate: m.last_maintenance_date
      })) || [],
      
      // Legacy/compatibility fields
      category: equipment.equipment_type || 'General',
      customer: '',
      install_date: '',
      warranty_expiry_date: '',
      warranty_status: 'unknown',
      last_maintenance_date: equipment.last_service_date || '',
      next_maintenance_date: equipment.next_service_date || '',
      maintenance_frequency: 'as-needed',
      created_at: equipment.created_at,
      updated_at: equipment.updated_at,
      inspection_template_id: equipment.inspection_template_id || null
    } as unknown as EquipmentDetails;
  } catch (error) {
    console.error('Error fetching equipment details:', error);
    return null;
  }
}

export async function updateEquipmentStatus(id: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('equipment_assets')
      .update({ status: status as any, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error updating equipment status:', error);
    return false;
  }
}

export async function getAllEquipment(): Promise<Equipment[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as any;
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    return [];
  }
}
