
import { Equipment } from "@/types/equipment";
import { addDays, differenceInDays, parseISO, isAfter } from "date-fns";

type RecommendationType = 'urgent' | 'soon' | 'normal' | 'good';

export interface EquipmentRecommendation {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: RecommendationType;
  reason: string;
  action: string;
  priority: number; // 1-10, with 10 being highest
  dueDate?: string;
}

/**
 * Analyzes equipment data and returns maintenance recommendations
 */
export const getEquipmentRecommendations = (equipmentItems: Equipment[]): EquipmentRecommendation[] => {
  if (!equipmentItems || equipmentItems.length === 0) return [];
  
  const recommendations: EquipmentRecommendation[] = [];
  const today = new Date();
  
  equipmentItems.forEach(equipment => {
    // Check for overdue maintenance
    if (equipment.next_maintenance_date) {
      const nextMaintenanceDate = parseISO(equipment.next_maintenance_date);
      if (isAfter(today, nextMaintenanceDate)) {
        recommendations.push({
          id: `maint-overdue-${equipment.id}`,
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          type: 'urgent',
          reason: `Maintenance overdue since ${equipment.next_maintenance_date}`,
          action: 'Schedule maintenance immediately',
          priority: 10,
          dueDate: equipment.next_maintenance_date
        });
      } 
      // Check for upcoming maintenance (within 30 days)
      else if (differenceInDays(nextMaintenanceDate, today) <= 30) {
        recommendations.push({
          id: `maint-upcoming-${equipment.id}`,
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          type: 'soon',
          reason: `Maintenance due in ${differenceInDays(nextMaintenanceDate, today)} days`,
          action: 'Schedule maintenance soon',
          priority: 7,
          dueDate: equipment.next_maintenance_date
        });
      }
    }
    
    // Check warranty status
    if (equipment.warranty_expiry_date) {
      const warrantyExpiryDate = parseISO(equipment.warranty_expiry_date);
      if (equipment.warranty_status === 'active') {
        // Warranty expiring within 60 days
        if (differenceInDays(warrantyExpiryDate, today) <= 60 && isAfter(warrantyExpiryDate, today)) {
          recommendations.push({
            id: `warranty-expiring-${equipment.id}`,
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            type: 'soon',
            reason: `Warranty expires in ${differenceInDays(warrantyExpiryDate, today)} days`,
            action: 'Consider extended warranty options',
            priority: 5,
            dueDate: equipment.warranty_expiry_date
          });
        }
      } else if (equipment.warranty_status === 'expired') {
        recommendations.push({
          id: `warranty-expired-${equipment.id}`,
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          type: 'normal',
          reason: 'Equipment warranty has expired',
          action: 'Consider purchasing extended coverage',
          priority: 4
        });
      }
    }
    
    // Check equipment status
    if (equipment.status === 'maintenance-required') {
      recommendations.push({
        id: `status-maintenance-${equipment.id}`,
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        type: 'urgent',
        reason: 'Equipment flagged for maintenance',
        action: 'Address maintenance requirements',
        priority: 9
      });
    } else if (equipment.status === 'out-of-service') {
      recommendations.push({
        id: `status-outofservice-${equipment.id}`,
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        type: 'urgent',
        reason: 'Equipment is out of service',
        action: 'Evaluate repair or replacement',
        priority: 10
      });
    }
  });
  
  // Sort recommendations by priority (highest first)
  return recommendations.sort((a, b) => b.priority - a.priority);
};

/**
 * Gets color class for recommendation type
 */
export const getRecommendationTypeColor = (type: RecommendationType): string => {
  switch (type) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
    case 'soon': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'good': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};
