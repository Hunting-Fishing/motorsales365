
import { Equipment } from "@/types/equipment";

// Equipment status mapping with styles
export const equipmentStatusMap = {
  operational: {
    label: "Operational",
    classes: "bg-green-100 text-green-800 border-green-300"
  },
  "maintenance-required": {
    label: "Maintenance Required", 
    classes: "bg-yellow-100 text-yellow-800 border-yellow-300"
  },
  "out-of-service": {
    label: "Out of Service",
    classes: "bg-red-100 text-red-800 border-red-300"
  },
  decommissioned: {
    label: "Decommissioned",
    classes: "bg-gray-100 text-gray-800 border-gray-300"
  }
};

// Maintenance frequency display mapping
export const maintenanceFrequencyMap: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly", 
  "bi-annually": "Bi-Annually",
  annually: "Annually",
  "as-needed": "As Needed"
};

// Get equipment with maintenance due within specified days
export const getMaintenanceDueEquipment = (equipment: Equipment[], daysThreshold: number = 30): Equipment[] => {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  return equipment.filter(item => {
    if (!item.next_maintenance_date) {
      return false;
    }
    
    const maintenanceDate = new Date(item.next_maintenance_date);
    return maintenanceDate <= thresholdDate;
  });
};

// Get equipment with warranties expiring within specified days
export const getWarrantyExpiringEquipment = (equipment: Equipment[], daysThreshold: number = 60): Equipment[] => {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  return equipment.filter(item => {
    if (item.warranty_status !== "active" || !item.warranty_expiry_date) {
      return false;
    }
    
    const expiryDate = new Date(item.warranty_expiry_date);
    return expiryDate <= thresholdDate && expiryDate >= today;
  });
};
