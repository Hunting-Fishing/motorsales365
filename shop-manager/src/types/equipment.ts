export type EquipmentStatus = 'operational' | 'maintenance' | 'out_of_service' | 'down';

export interface Equipment {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  serial_number: string;
  category: string;
  status: string; // Using string to match database schema
  location: string;
  customer: string;
  purchase_date: string;
  install_date: string;
  warranty_expiry_date: string;
  warranty_status: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  maintenance_frequency: string;
  maintenance_history?: any;
  maintenance_schedules?: any;
  work_order_history?: any;
  notes?: string;
  profile_image_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EquipmentStats {
  total: number;
  operational: number;
  needsMaintenance: number;
  outOfService: number;
}

export interface EquipmentMaintenance {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  description: string;
  performed_date: string;
  performed_by?: string;
  cost?: number;
  notes?: string;
  next_maintenance_date?: string;
  attachments?: any[];
  created_at: string;
}

// Compatibility aliases for existing files
export interface MaintenanceRecord extends EquipmentMaintenance {}
export interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  frequency: string;
  next_due: string;
  description: string;
  assigned_to?: string;
}