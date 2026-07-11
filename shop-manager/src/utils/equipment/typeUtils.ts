
import type { EquipmentStatus, MaintenanceRecord, MaintenanceSchedule } from "@/types/equipment";

/**
 * Safely converts Json arrays to typed arrays
 */
export function safeArrayConversion<T>(value: any, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as unknown) as T[] : fallback;
}

/**
 * Normalizes equipment status from database
 */
export function normalizeEquipmentStatus(status: string): EquipmentStatus {
  return status as EquipmentStatus;
}

/**
 * Transforms raw equipment data from database to application format
 */
export function transformEquipmentData(item: any) {
  return {
    ...item,
    status: normalizeEquipmentStatus(item.status),
    shop_id: null, // Equipment table doesn't have shop_id, so set to null
    work_order_history: safeArrayConversion(item.work_order_history),
    maintenance_history: safeArrayConversion<MaintenanceRecord>(item.maintenance_history),
    maintenance_schedules: safeArrayConversion<MaintenanceSchedule>(item.maintenance_schedules),
  };
}

/**
 * Prepares equipment data for database insertion
 * Generates ID and includes all required fields for the equipment table
 */
export function prepareEquipmentForInsert(equipmentData: any) {
  // Generate a unique ID for the equipment
  const equipmentId = `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: equipmentId,
    name: equipmentData.name,
    model: equipmentData.model || '',
    serial_number: equipmentData.serial_number || '',
    manufacturer: equipmentData.manufacturer || '',
    category: equipmentData.category,
    purchase_date: equipmentData.purchase_date || null,
    install_date: equipmentData.install_date || null,
    customer: equipmentData.customer,
    location: equipmentData.location || '',
    status: equipmentData.status || 'operational',
    next_maintenance_date: equipmentData.next_maintenance_date || null,
    maintenance_frequency: equipmentData.maintenance_frequency || 'quarterly',
    last_maintenance_date: equipmentData.last_maintenance_date || null,
    warranty_expiry_date: equipmentData.warranty_expiry_date || null,
    warranty_status: equipmentData.warranty_status || '',
    notes: equipmentData.notes || '',
    // Set JSON fields to empty arrays initially - these match the database jsonb fields
    work_order_history: [],
    maintenance_history: [],
    maintenance_schedules: []
  };
}
