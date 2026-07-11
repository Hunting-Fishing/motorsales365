import { useMemo } from 'react';
import { Customer, CustomerEquipmentType } from '@/types/customer';

export interface EquipmentTypeCount {
  type: CustomerEquipmentType;
  count: number;
  label: string;
}

export interface CustomerEquipmentStats {
  total: number;
  byType: EquipmentTypeCount[];
}

const EQUIPMENT_TYPE_LABELS: Record<CustomerEquipmentType, string> = {
  'vehicle': 'Vehicles',
  'generator': 'Generators',
  'forklift': 'Forklifts',
  'semi_truck': 'Semi Trucks',
  'small_engine': 'Small Engines',
  'outboard_motor': 'Outboard Motors',
  'marine_equipment': 'Marine Equipment',
  'heavy_equipment': 'Heavy Equipment',
  'trailer': 'Trailers',
  'rv': 'RVs',
  'atv_utv': 'ATVs/UTVs',
  'other': 'Other'
};

export function useCustomerEquipmentStats(customer: Customer | null): CustomerEquipmentStats {
  return useMemo(() => {
    if (!customer || !customer.vehicles || customer.vehicles.length === 0) {
      return {
        total: 0,
        byType: []
      };
    }

    // Count equipment by type
    const typeCounts = new Map<CustomerEquipmentType, number>();
    
    customer.vehicles.forEach(vehicle => {
      const equipmentType = (vehicle.equipment_type || 'vehicle') as CustomerEquipmentType;
      typeCounts.set(equipmentType, (typeCounts.get(equipmentType) || 0) + 1);
    });

    // Convert to array and sort by count
    const byType: EquipmentTypeCount[] = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        label: EQUIPMENT_TYPE_LABELS[type]
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: customer.vehicles.length,
      byType
    };
  }, [customer]);
}
